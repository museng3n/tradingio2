import argparse
import asyncio
import contextlib
import json
import logging
import signal
import sys
from typing import Any, Dict, List

from telegram_client import ChannelMonitor, TradingHubTelegramClient

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stderr,
)
logger = logging.getLogger(__name__)


def emit_event(event: str, message: str | None = None, **extra: Any) -> None:
    payload: Dict[str, Any] = {'event': event}
    if message is not None:
        payload['message'] = message
    payload.update(extra)
    sys.stdout.write(json.dumps(payload) + '\n')
    sys.stdout.flush()


async def run_bridge(session_string: str, selected_channels: List[Dict[str, Any]]) -> int:
    if not selected_channels:
        emit_event('start_failed', 'At least one selected channel is required')
        return 1

    channel_ids = [str(channel['id']) for channel in selected_channels if channel.get('id')]
    if not channel_ids:
        emit_event('start_failed', 'Selected channels payload did not include channel ids')
        return 1

    client_wrapper = None
    monitor_task = None

    try:
        client_wrapper = await TradingHubTelegramClient.from_session_string(session_string)
        monitor = ChannelMonitor(client_wrapper.client, channel_ids)
        monitor_task = asyncio.create_task(monitor.start_monitoring())
        await asyncio.sleep(0)

        if monitor_task.done():
            await monitor_task

        emit_event('ready', selected_channels_count=len(channel_ids))
        await monitor_task
        return 0
    except ValueError as error:
        message = str(error)
        if 'expired' in message.lower() or 'not valid' in message.lower():
            emit_event('auth_invalid', message)
        else:
            emit_event('start_failed', message)
        return 1
    except Exception as error:
        logger.exception('Runtime bridge failed')
        emit_event('start_failed', str(error))
        return 1
    finally:
        if monitor_task and not monitor_task.done():
            monitor_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await monitor_task

        if client_wrapper:
            with contextlib.suppress(Exception):
                await client_wrapper.disconnect()


def install_signal_handlers(loop: asyncio.AbstractEventLoop) -> asyncio.Event:
    shutdown_event = asyncio.Event()

    def _request_shutdown(*_: object) -> None:
        shutdown_event.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _request_shutdown)
        except NotImplementedError:
            signal.signal(sig, lambda *_args: shutdown_event.set())

    return shutdown_event


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--user-id', required=True)
    parser.add_argument('--selected-channels-json', required=True)
    args = parser.parse_args()

    try:
        selected_channels = json.loads(args.selected_channels_json)
        if not isinstance(selected_channels, list):
            raise ValueError('selected channels payload must be a list')
    except Exception as error:
        emit_event('start_failed', f'Invalid selected channels payload: {error}')
        return 1

    try:
        startup_payload = json.load(sys.stdin)
        session_string = startup_payload['session_string']
        if not isinstance(session_string, str) or not session_string:
            raise ValueError('session_string must be a non-empty string')
    except Exception as error:
        emit_event('start_failed', f'Invalid startup payload: {error}')
        return 1

    loop = asyncio.get_running_loop()
    shutdown_event = install_signal_handlers(loop)
    bridge_task = asyncio.create_task(run_bridge(session_string, selected_channels))
    shutdown_task = asyncio.create_task(shutdown_event.wait())

    done, pending = await asyncio.wait(
        {bridge_task, shutdown_task},
        return_when=asyncio.FIRST_COMPLETED,
    )

    if shutdown_task in done and not bridge_task.done():
        bridge_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await bridge_task
        return 0

    shutdown_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await shutdown_task
    return await bridge_task


if __name__ == '__main__':
    raise SystemExit(asyncio.run(main()))
