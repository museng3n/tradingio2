import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import logger from '../utils/logger';

const router = Router();

// Validate API key (JWT token) - Used by Telegram Client
router.post('/validate-key', async (req: Request, res: Response) => {
    try {
        const { api_key } = req.body;

        if (!api_key) {
            res.status(400).json({
                success: false,
                error: 'API key is required'
            });
            return;
        }

        // Verify JWT token
        const decoded = jwt.verify(api_key, process.env.JWT_SECRET!) as {
            userId: string;
            email: string;
            role: string;
        };

        // Get user from database
        const user = await User.findById(decoded.userId);

        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found'
            });
            return;
        }

        logger.info(`API key validated for user: ${user.email}`);

        res.json({
            success: true,
            phone_number: user.phoneNumber || '',
            user_id: user._id,
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        logger.error('Validate key error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid API key'
        });
    }
});

export default router;
