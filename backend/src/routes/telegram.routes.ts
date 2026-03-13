import { Router } from 'express';
import telegramController from '../controllers/telegram.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/runtime-status', telegramController.getRuntimeStatus);

export default router;
