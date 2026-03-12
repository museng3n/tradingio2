import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import logger from '../utils/logger';

const router = Router();

// Session upload endpoint - validates API key from body (not header)
router.post('/upload', async (req, res: Response) => {
    try {
        const {
            api_key,
            encrypted_session,
            phone_number,
            selected_channels,
            client_info
        } = req.body;

        // Validate required fields
        if (!api_key) {
            res.status(400).json({
                success: false,
                error: 'API key is required'
            });
            return;
        }

        if (!encrypted_session) {
            res.status(400).json({
                success: false,
                error: 'Encrypted session is required'
            });
            return;
        }

        if (!phone_number) {
            res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
            return;
        }

        if (!selected_channels || selected_channels.length === 0) {
            res.status(400).json({
                success: false,
                error: 'At least one channel must be selected'
            });
            return;
        }

        // Verify API key (JWT token)
        let decoded;
        try {
            decoded = jwt.verify(api_key, process.env.JWT_SECRET!) as {
                userId: string;
                email: string;
                role: string;
            };
        } catch (jwtError) {
            res.status(401).json({
                success: false,
                error: 'Invalid API key'
            });
            return;
        }

        // Find and update user
        const user = await User.findById(decoded.userId);

        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found'
            });
            return;
        }

        // Update user with Telegram session data
        user.set({
            telegramSession: encrypted_session,
            phoneNumber: phone_number,
            selectedChannels: selected_channels,
            telegramConnected: true,
            telegramConnectedAt: new Date()
        });

        await user.save();

        logger.info(`✅ Session uploaded for user: ${user.email}`);
        logger.info(`📱 Phone: ${phone_number}`);
        logger.info(`📢 Channels: ${selected_channels.length}`);

        res.json({
            success: true,
            message: 'Session uploaded successfully',
            channels_count: selected_channels.length
        });

    } catch (error) {
        logger.error('Session upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload session'
        });
    }
});

export default router;
