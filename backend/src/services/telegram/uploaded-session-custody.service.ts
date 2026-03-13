import crypto from 'crypto';
import type { IUser } from '../../models/User';

export type TelegramUploadedSessionDecryptionErrorCode =
  | 'SESSION_MISSING'
  | 'INVALID_API_KEY'
  | 'INVALID_ENCRYPTED_SESSION_FORMAT'
  | 'DECRYPTION_FAILED';

export type TelegramUploadedSessionDecryptionResult =
  | {
      ok: true;
      sessionString: string;
    }
  | {
      ok: false;
      code: TelegramUploadedSessionDecryptionErrorCode;
      message: string;
    };

export interface TelegramUploadedSessionAvailability {
  hasEncryptedSession: boolean;
  canDecryptForRuntimeUse: boolean;
}

type UploadedSessionOwner = Pick<IUser, 'telegramSession'> | null | undefined;

const SALT_SIZE = 32;
const NONCE_SIZE = 12;
const KEY_SIZE = 32;
const PBKDF2_ITERATIONS = 100000;
const ENCRYPTED_SESSION_PARTS = 4;

export class UploadedSessionCustodyService {
  hasEncryptedSession(user: UploadedSessionOwner): boolean {
    return typeof user?.telegramSession === 'string' && user.telegramSession.length > 0;
  }

  getRuntimeDecryptionAvailability(
    user: UploadedSessionOwner
  ): TelegramUploadedSessionAvailability {
    const hasEncryptedSession = this.hasEncryptedSession(user);

    return {
      hasEncryptedSession,
      canDecryptForRuntimeUse: hasEncryptedSession,
    };
  }

  decryptUserSessionForRuntimeUse(
    user: UploadedSessionOwner,
    apiKey: string
  ): TelegramUploadedSessionDecryptionResult {
    if (!this.hasEncryptedSession(user)) {
      return {
        ok: false,
        code: 'SESSION_MISSING',
        message: 'No uploaded Telegram session is available',
      };
    }

    return this.decryptEncryptedSessionForRuntimeUse(user!.telegramSession!, apiKey);
  }

  decryptEncryptedSessionForRuntimeUse(
    encryptedSession: string,
    apiKey: string
  ): TelegramUploadedSessionDecryptionResult {
    if (typeof apiKey !== 'string' || apiKey.length === 0) {
      return {
        ok: false,
        code: 'INVALID_API_KEY',
        message: 'API key is required for Telegram session decryption',
      };
    }

    if (typeof encryptedSession !== 'string' || encryptedSession.length === 0) {
      return {
        ok: false,
        code: 'SESSION_MISSING',
        message: 'No uploaded Telegram session is available',
      };
    }

    const payload = this.parseEncryptedSession(encryptedSession);

    if (!payload) {
      return {
        ok: false,
        code: 'INVALID_ENCRYPTED_SESSION_FORMAT',
        message: 'Uploaded Telegram session format is invalid',
      };
    }

    try {
      const key = crypto.pbkdf2Sync(
        apiKey,
        payload.salt,
        PBKDF2_ITERATIONS,
        KEY_SIZE,
        'sha256'
      );

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, payload.nonce);
      decipher.setAuthTag(payload.tag);

      const plaintext = Buffer.concat([
        decipher.update(payload.ciphertext),
        decipher.final(),
      ]);

      return {
        ok: true,
        sessionString: plaintext.toString('utf8'),
      };
    } catch {
      return {
        ok: false,
        code: 'DECRYPTION_FAILED',
        message: 'Uploaded Telegram session could not be decrypted',
      };
    }
  }

  private parseEncryptedSession(encryptedSession: string): {
    salt: Buffer;
    nonce: Buffer;
    ciphertext: Buffer;
    tag: Buffer;
  } | null {
    const parts = encryptedSession.split(':');

    if (parts.length !== ENCRYPTED_SESSION_PARTS) {
      return null;
    }

    const [saltValue, nonceValue, ciphertextValue, tagValue] = parts;

    try {
      const salt = Buffer.from(saltValue, 'base64');
      const nonce = Buffer.from(nonceValue, 'base64');
      const ciphertext = Buffer.from(ciphertextValue, 'base64');
      const tag = Buffer.from(tagValue, 'base64');

      if (
        salt.length !== SALT_SIZE ||
        nonce.length !== NONCE_SIZE ||
        tag.length !== 16 ||
        ciphertext.length === 0
      ) {
        return null;
      }

      return {
        salt,
        nonce,
        ciphertext,
        tag,
      };
    } catch {
      return null;
    }
  }
}

export default new UploadedSessionCustodyService();
