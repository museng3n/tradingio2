import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import signalRoutes from './signal.routes';
import webhookRoutes from './webhook.routes';
import positionRoutes from './position.routes';
import analyticsRoutes from './analytics.routes';
import dashboardRoutes from './dashboard.routes';
import userRoutes from './user.routes';
import sessionRoutes from './session.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/signals', signalRoutes);
router.use('/webhook', webhookRoutes);
router.use('/positions', positionRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/user', userRoutes);
router.use('/session', sessionRoutes);

export default router;
