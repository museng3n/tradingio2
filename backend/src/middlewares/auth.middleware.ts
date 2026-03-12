import { Request, Response, NextFunction } from 'express';
import jwtService from '../services/auth/jwt.service';
import { AppError } from '../utils/errors';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const payload = jwtService.verifyAccessToken(token);
    req.user = payload;

    next();
  } catch (error) {
    next(new AppError('Invalid or expired token', 401));
  }
};
