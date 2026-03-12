import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import AuditLog from '../models/AuditLog';
import logger from '../utils/logger';

export const auditLog = (action: string, resource: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await AuditLog.create({
        userId: req.user?.userId,
        action,
        resource,
        resourceId: req.params.id,
        details: {
          method: req.method,
          path: req.path,
          body: sanitizeBody(req.body),
          query: req.query
        },
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent')
      });
    } catch (error) {
      // Don't fail request if audit fails, just log
      logger.error('Audit log error:', error);
    }

    next();
  };
};

// Remove sensitive data from body before logging
function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['password', 'token', 'secret', 'twoFactorSecret', 'refreshToken'];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}
