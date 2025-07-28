import { Router } from 'express';
import { WalletController } from '../controllers/WalletController';
import { authenticateJWT, requireUser } from '../middleware/auth/jwtAuth';
// import { validate, userValidation } from '../middleware/validation/requestValidation';

const router = Router();
const walletController = new WalletController();

// Apply authentication middleware to all wallet routes
// router.use(authenticateJWT);
// router.use(requireUser);

// POST /api/wallet - Create a new wallet
router.post('/', async (req, res) => {
  await walletController.createWallet(req, res);
});

// GET /api/wallet - Get user's wallets
router.get('/', async (req, res) => {
  await walletController.getUserWallets(req, res);
});

// GET /api/wallet/:walletId - Get specific wallet details
router.get('/:walletId', async (req, res) => {
  await walletController.getWallet(req, res);
});

// POST /api/wallet/:walletId/signers - Add a signer to wallet
router.post('/:walletId/signers', async (req, res) => {
  await walletController.addSigner(req, res);
});

// DELETE /api/wallet/:walletId/signers/:signerUserId - Remove a signer from wallet
router.delete('/:walletId/signers/:signerUserId', async (req, res) => {
  await walletController.removeSigner(req, res);
});

// PUT /api/wallet/:walletId/signers/:signerUserId/weight - Update signer weight
router.put('/:walletId/signers/:signerUserId/weight', async (req, res) => {
  await walletController.updateSignerWeight(req, res);
});

// GET /api/wallet/:walletId/signers - Get wallet signers
router.get('/:walletId/signers', async (req, res) => {
  await walletController.getWalletSigners(req, res);
});

// PUT /api/wallet/:walletId/status - Update wallet status
router.put('/:walletId/status', async (req, res) => {
  await walletController.updateWalletStatus(req, res);
});

export default router; 