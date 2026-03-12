import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export class TwoFAService {
  generateSecret(email: string): { secret: string; otpauthUrl: string | undefined } {
    const secret = speakeasy.generateSecret({
      name: `TradingHub (${email})`,
      issuer: 'TradingHub'
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url
    };
  }

  async generateQRCode(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }

  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2  // Allow 2 steps before/after for clock drift
    });
  }
}

export default new TwoFAService();
