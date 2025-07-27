import { Router } from 'express';
import { HealthController } from '../controllers/HealthController';

const router = Router();

// GET /health
router.get('/', async (req, res) => {
  await HealthController.healthCheck(req, res);
});

// GET /health/ready
router.get('/ready', async (req, res) => {
  await HealthController.readinessCheck(req, res);
});

// GET /health/live
router.get('/live', async (req, res) => {
  await HealthController.livenessCheck(req, res);
});

export default router; 