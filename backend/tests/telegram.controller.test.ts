import type { NextFunction, Response } from 'express';
import User from '../src/models/User';
import { TelegramController } from '../src/controllers/telegram.controller';
import type { AuthRequest } from '../src/middlewares/auth.middleware';
import type { TelegramActivationRequestResult } from '../src/services/telegram/activation-orchestration.service';
import type { TelegramRuntimeOwnerStopResult } from '../src/services/telegram/runtime-owner.service';

describe('TelegramController', () => {
  const createResponse = (): Response =>
    ({
      json: jest.fn(),
    }) as unknown as Response;

  const createRequest = (
    overrides: Partial<AuthRequest> = {}
  ): AuthRequest =>
    ({
      user: {
        userId: 'user-1',
        email: 'user@example.com',
        role: 'USER',
      },
      body: {},
      ...overrides,
    }) as AuthRequest;

  const createNext = (): NextFunction => jest.fn();

  const mockFindByIdSelect = (value: unknown): void => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(value),
    } as never);
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves runtime-status response behavior', async () => {
    mockFindByIdSelect({
      telegramRuntimeStatus: undefined,
      telegramRuntimeStatusUpdatedAt: null,
      telegramSessionUploadedAt: new Date('2026-03-13T00:00:00.000Z'),
      telegramActivationRequestedAt: null,
      selectedChannels: [{ id: '123', title: 'Gold Signals VIP', username: 'gold' }],
      telegramSession: 'encrypted-session',
      telegramConnectedAt: null,
      updatedAt: new Date('2026-03-13T01:00:00.000Z'),
    });

    const controller = new TelegramController();
    const req = createRequest();
    const res = createResponse();
    const next = createNext();

    await controller.getRuntimeStatus(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      data: {
        status: 'UPLOADED_NOT_ACTIVATED',
        statusUpdatedAt: '2026-03-13T00:00:00.000Z',
        sessionUploadedAt: '2026-03-13T00:00:00.000Z',
        activationRequestedAt: null,
        selectedChannels: [
          { id: '123', title: 'Gold Signals VIP', username: 'gold' },
        ],
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('starts runtime through activation orchestration and persists activationRequestedAt only on truthful success', async () => {
    const activationResult: TelegramActivationRequestResult = {
      accepted: true,
      deferred: false,
      code: 'STARTED',
      message: 'Telegram runtime is now owned in-process',
      effectiveStatus: 'MONITORING_ACTIVE',
      selectedChannelsCount: 1,
      custody: {
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      },
      shouldPersistActivationRequestedAt: true,
    };

    mockFindByIdSelect({
      telegramSession: 'encrypted-session',
      selectedChannels: [{ id: '123', title: 'Gold Signals VIP', username: 'gold' }],
      telegramRuntimeStatus: 'UPLOADED_NOT_ACTIVATED',
    });
    const findByIdAndUpdateSpy = jest
      .spyOn(User, 'findByIdAndUpdate')
      .mockResolvedValue(null as never);

    const orchestration = {
      attemptActivationRequest: jest.fn().mockResolvedValue(activationResult),
    };
    const runtimeOwner = {
      stopRuntime: jest.fn(),
    };

    const controller = new TelegramController(orchestration as never, runtimeOwner as never);
    const req = createRequest({
      body: {
        runtimeDecryptionKey: 'runtime-api-key',
      },
    });
    const res = createResponse();
    const next = createNext();

    await controller.startRuntime(req, res, next);

    expect(orchestration.attemptActivationRequest).toHaveBeenCalledWith({
      userId: 'user-1',
      runtimeDecryptionKey: 'runtime-api-key',
      user: {
        telegramSession: 'encrypted-session',
        selectedChannels: [{ id: '123', title: 'Gold Signals VIP', username: 'gold' }],
        telegramRuntimeStatus: 'UPLOADED_NOT_ACTIVATED',
      },
    });
    expect(findByIdAndUpdateSpy).toHaveBeenCalledWith('user-1', {
      $set: {
        telegramActivationRequestedAt: expect.any(Date),
      },
    });
    expect(res.json).toHaveBeenCalledWith({
      data: {
        ...activationResult,
        activationRequestedAt: expect.any(String),
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns truthful start failure mapping without persisting activationRequestedAt', async () => {
    const activationResult: TelegramActivationRequestResult = {
      accepted: false,
      deferred: false,
      code: 'MISSING_SELECTED_CHANNELS',
      message: 'Telegram activation requires at least one selected channel',
      effectiveStatus: 'UPLOADED_NOT_ACTIVATED',
      selectedChannelsCount: 0,
      custody: {
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      },
      shouldPersistActivationRequestedAt: false,
    };

    mockFindByIdSelect({
      telegramSession: 'encrypted-session',
      selectedChannels: [],
      telegramRuntimeStatus: 'UPLOADED_NOT_ACTIVATED',
    });
    const findByIdAndUpdateSpy = jest
      .spyOn(User, 'findByIdAndUpdate')
      .mockResolvedValue(null as never);

    const controller = new TelegramController(
      {
        attemptActivationRequest: jest.fn().mockResolvedValue(activationResult),
      } as never,
      {
        stopRuntime: jest.fn(),
      } as never
    );
    const req = createRequest({
      body: {
        runtimeDecryptionKey: 'runtime-api-key',
      },
    });
    const res = createResponse();
    const next = createNext();

    await controller.startRuntime(req, res, next);

    expect(findByIdAndUpdateSpy).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      data: {
        ...activationResult,
        activationRequestedAt: null,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('stops runtime through the runtime owner truthfully', async () => {
    const stopResult: TelegramRuntimeOwnerStopResult = {
      stopped: false,
      code: 'ALREADY_STOPPED',
      message: 'Telegram runtime is not currently owned in-process',
      status: 'DISCONNECTED',
    };

    const runtimeOwner = {
      stopRuntime: jest.fn().mockResolvedValue(stopResult),
    };

    const controller = new TelegramController(
      {
        attemptActivationRequest: jest.fn(),
      } as never,
      runtimeOwner as never
    );
    const req = createRequest();
    const res = createResponse();
    const next = createNext();

    await controller.stopRuntime(req, res, next);

    expect(runtimeOwner.stopRuntime).toHaveBeenCalledWith('user-1');
    expect(res.json).toHaveBeenCalledWith({
      data: stopResult,
    });
    expect(next).not.toHaveBeenCalled();
  });
});
