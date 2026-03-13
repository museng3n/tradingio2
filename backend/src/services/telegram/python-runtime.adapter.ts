import { spawn, type ChildProcessByStdio } from 'child_process';
import type { Readable, Writable } from 'stream';
import path from 'path';
import readline from 'readline';
import type { ISelectedChannel } from '../../models/User';
import logger from '../../utils/logger';
import type {
  TelegramRuntimeAdapter,
  TelegramRuntimeAdapterStartResult,
  TelegramRuntimeHandle,
} from './runtime-owner.service';

interface PythonBridgeMessage {
  event?: string;
  message?: string;
}

interface BridgeStartOptions {
  pythonCommand?: string;
  scriptPath?: string;
  startupTimeoutMs?: number;
}

const DEFAULT_STARTUP_TIMEOUT_MS = 15000;
const STDERR_TAIL_LIMIT = 4096;

const appendTail = (buffer: string, chunk: string): string => {
  const next = buffer + chunk;
  return next.length <= STDERR_TAIL_LIMIT
    ? next
    : next.slice(next.length - STDERR_TAIL_LIMIT);
};

class PythonRuntimeHandle implements TelegramRuntimeHandle {
  private stopping = false;
  private exited = false;
  private unexpectedExitHandler: (() => void) | null = null;
  private pendingUnexpectedExit = false;

  constructor(
    private readonly child: ChildProcessByStdio<Writable, Readable, Readable>,
    private readonly cleanup: () => void
  ) {}

  onUnexpectedExit(handler: () => void): void {
    this.unexpectedExitHandler = handler;

    if (!this.pendingUnexpectedExit) {
      return;
    }

    this.pendingUnexpectedExit = false;
    queueMicrotask(() => {
      this.unexpectedExitHandler?.();
    });
  }

  handleProcessExit(): void {
    this.exited = true;
    this.cleanup();

    if (this.stopping) {
      return;
    }

    if (this.unexpectedExitHandler) {
      this.unexpectedExitHandler();
      return;
    }

    this.pendingUnexpectedExit = true;
  }

  async stop(): Promise<void> {
    if (this.stopping) {
      return;
    }

    this.stopping = true;

    if (this.exited || this.child.exitCode !== null || this.child.killed) {
      this.cleanup();
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        this.child.removeListener('exit', handleExit);
        this.child.removeListener('error', handleError);
      };

      const handleExit = () => {
        cleanup();
        resolve();
      };

      const handleError = (error: Error) => {
        cleanup();
        reject(error);
      };

      this.child.once('exit', handleExit);
      this.child.once('error', handleError);

      try {
        this.child.kill('SIGTERM');
      } catch (error) {
        cleanup();
        this.cleanup();
        reject(error as Error);
      }
    });
  }
}

export class PythonTelegramRuntimeAdapter implements TelegramRuntimeAdapter {
  private readonly pythonCommand: string;
  private readonly scriptPath: string;
  private readonly startupTimeoutMs: number;

  constructor(options: BridgeStartOptions = {}) {
    this.pythonCommand =
      options.pythonCommand ??
      process.env.TRADINGHUB_TELEGRAM_PYTHON_CMD ??
      'python';
    this.scriptPath =
      options.scriptPath ??
      process.env.TRADINGHUB_TELEGRAM_BRIDGE_SCRIPT ??
      path.resolve(
        __dirname,
        '../../../..',
        'TradingHub-TelegramClient',
        'src',
        'runtime_bridge.py'
      );
    this.startupTimeoutMs = options.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS;
  }

  async start(params: {
    userId: string;
    sessionString: string;
    selectedChannels: ISelectedChannel[];
  }): Promise<TelegramRuntimeAdapterStartResult> {
    const child = spawn(
      this.pythonCommand,
      [
        this.scriptPath,
        '--user-id',
        params.userId,
        '--selected-channels-json',
        JSON.stringify(params.selectedChannels),
      ],
      {
        cwd: path.dirname(this.scriptPath),
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    child.stdin.write(
      JSON.stringify({
        session_string: params.sessionString,
      })
    );
    child.stdin.end();

    return await this.awaitBridgeReadiness(child, params.userId);
  }

  private async awaitBridgeReadiness(
    child: ChildProcessByStdio<Writable, Readable, Readable>,
    userId: string
  ): Promise<TelegramRuntimeAdapterStartResult> {
    return await new Promise<TelegramRuntimeAdapterStartResult>((resolve) => {
      let settled = false;
      let stderrBuffer = '';
      let runtimeHandle: PythonRuntimeHandle | null = null;
      let runtimeStreamsCleaned = false;

      const stdout = readline.createInterface({ input: child.stdout });
      const timeout = setTimeout(() => {
        finish({
          ok: false,
          code: 'START_FAILED',
          message: 'Telegram Python runtime bridge did not become ready in time',
        });
      }, this.startupTimeoutMs);

      const detachReadinessListeners = () => {
        clearTimeout(timeout);
        stdout.removeListener('line', handleStdoutLine);
        child.stderr.removeListener('data', handleStderrData);
        child.removeListener('error', handleError);
        child.removeListener('exit', handleExit);
      };

      const cleanupRuntimeStreams = () => {
        if (runtimeStreamsCleaned) {
          return;
        }

        runtimeStreamsCleaned = true;
        detachReadinessListeners();
        stdout.close();
        child.stderr.removeListener('data', handleRuntimeStderrData);
        child.removeListener('exit', handleRuntimeExit);
      };

      const killIfRunning = () => {
        if (child.exitCode === null && !child.killed) {
          try {
            child.kill('SIGTERM');
          } catch {
            // Best-effort cleanup only.
          }
        }
      };

      const finish = (result: TelegramRuntimeAdapterStartResult) => {
        if (settled) {
          return;
        }

        settled = true;

        if (result.ok) {
          detachReadinessListeners();
          runtimeHandle ??= new PythonRuntimeHandle(child, cleanupRuntimeStreams);
          child.stderr.on('data', handleRuntimeStderrData);
          child.once('exit', handleRuntimeExit);
          resolve({
            ok: true,
            handle: runtimeHandle,
          });
          return;
        }

        cleanupRuntimeStreams();
        killIfRunning();
        resolve(result);
      };

      const handleStdoutLine = (line: string) => {
        const message = this.tryParseBridgeMessage(line);
        if (!message?.event) {
          return;
        }

        if (message.event === 'ready') {
          finish({
            ok: true,
            handle: runtimeHandle ?? new PythonRuntimeHandle(child, cleanupRuntimeStreams),
          });
          return;
        }

        if (message.event === 'auth_invalid') {
          finish({
            ok: false,
            code: 'AUTH_INVALID',
            message:
              message.message ??
              'Telegram session is not valid or has expired for Python runtime bridge',
          });
          return;
        }

        if (message.event === 'start_failed') {
          finish({
            ok: false,
            code: 'START_FAILED',
            message:
              message.message ??
              'Telegram Python runtime bridge failed to start monitoring',
          });
        }
      };

      const handleStderrData = (chunk: Buffer | string) => {
        stderrBuffer = appendTail(stderrBuffer, chunk.toString());
      };

      const handleRuntimeStderrData = (_chunk: Buffer | string) => {
        // Keep draining stderr for the full child lifetime to avoid pipe backpressure.
      };

      const handleError = (error: Error) => {
        finish({
          ok: false,
          code: 'START_FAILED',
          message: `Telegram Python runtime bridge process failed to launch: ${error.message}`,
        });
      };

      const handleExit = (code: number | null, signal: NodeJS.Signals | null) => {
        if (settled) {
          return;
        }

        const stderrMessage = stderrBuffer.trim();
        const suffix = stderrMessage
          ? ` ${stderrMessage}`
          : ` Bridge exited before readiness (code=${code}, signal=${signal}).`;

        finish({
          ok: false,
          code: 'START_FAILED',
          message: `Telegram Python runtime bridge exited before readiness.${suffix}`,
        });
      };

      const handleRuntimeExit = () => {
        runtimeHandle?.handleProcessExit();
      };

      stdout.on('line', handleStdoutLine);
      child.stderr.on('data', handleStderrData);
      child.once('error', handleError);
      child.once('exit', handleExit);

      logger.info(`Starting Telegram Python runtime bridge for user ${userId}`);
    });
  }

  private tryParseBridgeMessage(line: string): PythonBridgeMessage | null {
    try {
      return JSON.parse(line) as PythonBridgeMessage;
    } catch {
      return null;
    }
  }
}

export default new PythonTelegramRuntimeAdapter();
