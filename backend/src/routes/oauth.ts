import { Router } from 'express';
import { OAuthController } from '../controllers/OAuthController';

const router = Router();
const oauthController = new OAuthController();

// POST /api/oauth/google
router.post('/google', async (req, res) => {
  await oauthController.googleAuth(req, res);
});

// POST /api/oauth/apple
router.post('/apple', async (req, res) => {
  await oauthController.appleAuth(req, res);
});

// POST /api/oauth/link
router.post('/link', async (req, res) => {
  await oauthController.linkOAuthAccount(req, res);
});

// POST /api/oauth/unlink
router.post('/unlink', async (req, res) => {
  await oauthController.unlinkOAuthAccount(req, res);
});

export default router; 