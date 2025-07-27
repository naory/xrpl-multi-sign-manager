import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const router = Router();
const authController = new AuthController();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  await authController.register(req, res);
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  await authController.login(req, res);
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  await authController.refresh(req, res);
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  await authController.logout(req, res);
});

// POST /api/auth/logout-all
router.post('/logout-all', async (req, res) => {
  await authController.logoutAll(req, res);
});

export default router; 