import { Router } from 'express';
import settingsController from '../controllers/settings.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get(
  '/tp-strategy',
  settingsController.getTPStrategySettings
);

router.put(
  '/tp-strategy',
  settingsController.updateTPStrategySettings
);

export default router;
