import { Router } from 'express';
import settingsController from '../controllers/settings.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get(
  '/blocked-symbols',
  settingsController.getBlockedSymbolsSettings
);

router.put(
  '/blocked-symbols',
  settingsController.updateBlockedSymbolsSettings
);

router.get(
  '/position-security',
  settingsController.getPositionSecuritySettings
);

router.put(
  '/position-security',
  settingsController.updatePositionSecuritySettings
);

router.get(
  '/risk-management',
  settingsController.getRiskManagementSettings
);

router.put(
  '/risk-management',
  settingsController.updateRiskManagementSettings
);

router.get(
  '/tp-strategy',
  settingsController.getTPStrategySettings
);

router.put(
  '/tp-strategy',
  settingsController.updateTPStrategySettings
);

export default router;
