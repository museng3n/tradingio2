import crypto from 'crypto';
import uploadedSessionCustodyService from '../src/services/telegram/uploaded-session-custody.service';

const encryptLikeConnector = (sessionString: string, apiKey: string): string => {
  const salt = crypto.randomBytes(32);
  const nonce = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(apiKey, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(sessionString, 'utf8')),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [salt, nonce, ciphertext, tag]
    .map((part) => part.toString('base64'))
    .join(':');
};

describe('UploadedSessionCustodyService', () => {
  it('decrypts encrypted sessions produced with the connector format', () => {
    const apiKey = 'test-api-key-1234567890';
    const sessionString = '1AgAOMTQ5LjE1NC4xNjcuNTABu4example-session';
    const encryptedSession = encryptLikeConnector(sessionString, apiKey);

    const result = uploadedSessionCustodyService.decryptEncryptedSessionForRuntimeUse(
      encryptedSession,
      apiKey
    );

    expect(result).toEqual({
      ok: true,
      sessionString,
    });
  });

  it('reports missing session availability without decrypting', () => {
    expect(
      uploadedSessionCustodyService.getRuntimeDecryptionAvailability({
        telegramSession: undefined,
      } as never)
    ).toEqual({
      hasEncryptedSession: false,
      canDecryptForRuntimeUse: false,
    });

    expect(
      uploadedSessionCustodyService.decryptUserSessionForRuntimeUse(
        { telegramSession: undefined } as never,
        'test-api-key-1234567890'
      )
    ).toEqual({
      ok: false,
      code: 'SESSION_MISSING',
      message: 'No uploaded Telegram session is available',
    });
  });

  it('rejects malformed encrypted session payloads', () => {
    const result =
      uploadedSessionCustodyService.decryptEncryptedSessionForRuntimeUse(
        'not-a-valid-payload',
        'test-api-key-1234567890'
      );

    expect(result).toEqual({
      ok: false,
      code: 'INVALID_ENCRYPTED_SESSION_FORMAT',
      message: 'Uploaded Telegram session format is invalid',
    });
  });

  it('fails safely when the wrong API key is supplied', () => {
    const encryptedSession = encryptLikeConnector(
      '1AgAOMTQ5LjE1NC4xNjcuNTABu4example-session',
      'correct-api-key'
    );

    const result = uploadedSessionCustodyService.decryptEncryptedSessionForRuntimeUse(
      encryptedSession,
      'wrong-api-key'
    );

    expect(result).toEqual({
      ok: false,
      code: 'DECRYPTION_FAILED',
      message: 'Uploaded Telegram session could not be decrypted',
    });
  });
});
