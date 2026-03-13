import { Router } from 'express';
import telegramController from '../controllers/telegram.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/runtime-status', telegramController.getRuntimeStatus.bind(telegramController));
router.post('/activate', telegramController.startRuntime.bind(telegramController));
router.post('/stop', telegramController.stopRuntime.bind(telegramController));

export default router;
