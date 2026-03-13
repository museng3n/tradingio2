import { EventEmitter } from 'events';
import { PassThrough, Writable } from 'stream';
import { PythonTelegramRuntimeAdapter } from '../src/services/telegram/python-runtime.adapter';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

import { spawn } from 'child_process';

class CaptureWritable extends Writable {
  payload = '';

  _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.payload += chunk.toString();
    callback();
  }
}

class ChildProcessStub extends EventEmitter {
  stdin = new CaptureWritable();
  stdout = new PassThrough();
  stderr = new PassThrough();
  exitCode: number | null = null;
  killed = false;

  kill(): boolean {
    this.killed = true;
    this.exitCode = 0;
    this.emit('exit', 0, 'SIGTERM');
    return true;
  }
}

describe('PythonTelegramRuntimeAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('waits for a real ready signal before returning a live runtime handle', async () => {
    const child = new ChildProcessStub();
    (spawn as jest.Mock).mockReturnValue(child);

    const adapter = new PythonTelegramRuntimeAdapter({
      scriptPath: 'C:\\bridge\\runtime_bridge.py',
      startupTimeoutMs: 1000,
    });

    const startPromise = adapter.start({
      userId: 'user-1',
      sessionString: 'telethon-session',
      selectedChannels: [{ id: '123', title: 'Gold Signals VIP', username: 'gold' }],
    });

    const spawnArgs = (spawn as jest.Mock).mock.calls[0][1];
    expect(spawnArgs).not.toContain('telethon-session');

    child.stdout.write(
      `${JSON.stringify({ event: 'ready', selected_channels_count: 1 })}\n`
    );

    const result = await startPromise;
    expect(JSON.parse(child.stdin.payload)).toEqual({
      session_string: 'telethon-session',
    });
    expect(child.stderr.listenerCount('data')).toBeGreaterThan(0);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected ready runtime handle');
    }

    child.stderr.write('bridge log after readiness\n');
    await result.handle.stop();
    expect(child.killed).toBe(true);
  });

  it('notifies unexpected post-ready child exit through the live runtime handle', async () => {
    const child = new ChildProcessStub();
    (spawn as jest.Mock).mockReturnValue(child);

    const adapter = new PythonTelegramRuntimeAdapter({
      scriptPath: 'C:\\bridge\\runtime_bridge.py',
      startupTimeoutMs: 1000,
    });

    const startPromise = adapter.start({
      userId: 'user-1',
      sessionString: 'telethon-session',
      selectedChannels: [{ id: '123', title: 'Gold Signals VIP', username: 'gold' }],
    });

    child.stdout.write(`${JSON.stringify({ event: 'ready' })}\n`);

    const result = await startPromise;
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected ready runtime handle');
    }

    const unexpectedExitHandler = jest.fn();
    result.handle.onUnexpectedExit?.(unexpectedExitHandler);

    child.exitCode = 1;
    child.emit('exit', 1, null);
    await new Promise((resolve) => setImmediate(resolve));

    expect(unexpectedExitHandler).toHaveBeenCalledTimes(1);
  });

  it('does not misclassify intentional stop as an unexpected crash', async () => {
    const child = new ChildProcessStub();
    (spawn as jest.Mock).mockReturnValue(child);

    const adapter = new PythonTelegramRuntimeAdapter({
      scriptPath: 'C:\\bridge\\runtime_bridge.py',
      startupTimeoutMs: 1000,
    });

    const startPromise = adapter.start({
      userId: 'user-1',
      sessionString: 'telethon-session',
      selectedChannels: [{ id: '123', title: 'Gold Signals VIP', username: 'gold' }],
    });

    child.stdout.write(`${JSON.stringify({ event: 'ready' })}\n`);

    const result = await startPromise;
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected ready runtime handle');
    }

    const unexpectedExitHandler = jest.fn();
    result.handle.onUnexpectedExit?.(unexpectedExitHandler);

    await result.handle.stop();

    expect(unexpectedExitHandler).not.toHaveBeenCalled();
  });

  it('surfaces auth-invalid signals truthfully from the Python bridge', async () => {
    const child = new ChildProcessStub();
    (spawn as jest.Mock).mockReturnValue(child);

    const adapter = new PythonTelegramRuntimeAdapter({
      scriptPath: 'C:\\bridge\\runtime_bridge.py',
      startupTimeoutMs: 1000,
    });

    const startPromise = adapter.start({
      userId: 'user-1',
      sessionString: 'telethon-session',
      selectedChannels: [{ id: '123', title: 'Gold Signals VIP', username: 'gold' }],
    });

    child.stdout.write(
      `${JSON.stringify({
        event: 'auth_invalid',
        message: 'Session is not valid or expired',
      })}\n`
    );

    const result = await startPromise;

    expect(result).toEqual({
      ok: false,
      code: 'AUTH_INVALID',
      message: 'Session is not valid or expired',
    });
  });
});
