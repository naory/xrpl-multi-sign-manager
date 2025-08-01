import { XRPLService } from '../../src/services/XRPLService';
import { Wallet } from 'xrpl';

// Mock the XRPL client
jest.mock('xrpl', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    request: jest.fn(),
    autofill: jest.fn(),
    submitAndWait: jest.fn()
  })),
  Wallet: {
    generate: jest.fn(),
    fromSeed: jest.fn()
  },
  xrpl: {
    xrpToDrops: jest.fn(),
    dropsToXrp: jest.fn()
  }
}));

describe('XRPLService', () => {
  let xrplService: XRPLService;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    xrplService = new XRPLService();
    mockClient = (xrplService as any).client;
  });

  describe('connect', () => {
    it('should connect to XRPL node successfully', async () => {
      mockClient.connect.mockResolvedValue(undefined);

      await xrplService.connect();

      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should handle connection failure and try backup nodes', async () => {
      // Mock the primary node connection failure
      mockClient.connect.mockRejectedValue(new Error('Connection failed'));
      
      // Mock the backup nodes also failing
      const mockBackupClient = {
        connect: jest.fn().mockRejectedValue(new Error('Backup connection failed'))
      };
      
      // Mock the Client constructor to return different clients for different nodes
      const originalClient = require('xrpl').Client;
      require('xrpl').Client = jest.fn().mockImplementation((node) => {
        if (node.includes('backup')) {
          return mockBackupClient;
        }
        return mockClient;
      });

      await expect(xrplService.connect()).rejects.toThrow('All XRPL nodes failed to connect');
      
      // Restore original Client
      require('xrpl').Client = originalClient;
    });
  });

  describe('createWallet', () => {
    it('should create a wallet successfully', async () => {
      const mockWallet = {
        address: 'rTestAddress123',
        publicKey: 'testPublicKey',
        privateKey: 'testPrivateKey',
        seed: 'testSeed'
      };

      (Wallet.generate as jest.Mock).mockReturnValue(mockWallet);
      mockClient.request.mockResolvedValue({
        result: {
          account_data: {
            Balance: '1000000000'
          }
        }
      });

      const result = await xrplService.createWallet();

      expect(result.address).toBe(mockWallet.address);
      expect(result.publicKey).toBe(mockWallet.publicKey);
      expect(result.privateKey).toBe(mockWallet.privateKey);
      expect(result.seed).toBe(mockWallet.seed);
    });
  });

  describe('setupMultiSignature', () => {
    it('should setup multi-signature successfully', async () => {
      const mockWallet = {
        address: 'rTestAddress123',
        sign: jest.fn().mockReturnValue({ tx_blob: 'test_blob' })
      };

      const signers = [
        { address: 'rSigner1', weight: 1 },
        { address: 'rSigner2', weight: 2 }
      ];

      const mockPrepared = { Account: 'rTestAddress123' };
      const mockResult = {
        result: {
          hash: 'test_hash',
          meta: { TransactionResult: 'tesSUCCESS' }
        }
      };

      mockClient.autofill.mockResolvedValue(mockPrepared);
      mockClient.submitAndWait.mockResolvedValue(mockResult);

      const result = await xrplService.setupMultiSignature(mockWallet as any, signers, 2);

      expect(result.success).toBe(true);
      expect(result.transactionHash).toBe('test_hash');
      expect(result.quorum).toBe(2);
      expect(result.signerEntries).toEqual(signers);
    });

    it('should throw error for invalid quorum', async () => {
      const mockWallet = { address: 'rTestAddress123' };
      const signers = [{ address: 'rSigner1', weight: 1 }];

      await expect(
        xrplService.setupMultiSignature(mockWallet as any, signers, 0)
      ).rejects.toThrow('Quorum must be greater than 0');
    });

    it('should throw error when quorum exceeds total weight', async () => {
      const mockWallet = { address: 'rTestAddress123' };
      const signers = [{ address: 'rSigner1', weight: 1 }];

      await expect(
        xrplService.setupMultiSignature(mockWallet as any, signers, 5)
      ).rejects.toThrow('Quorum cannot exceed total signer weight');
    });
  });

  describe('getBalance', () => {
    it('should get balance successfully', async () => {
      const mockResponse = {
        result: {
          account_data: {
            Balance: '1000000000',
            Lines: [
              {
                currency: '534F4C4F00000000000000000000000000000000',
                balance: '1000000',
                account: 'rIssuer123'
              }
            ]
          }
        }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await xrplService.getBalance('rTestAddress123');

      expect(result.address).toBe('rTestAddress123');
      expect(result.xrpBalance).toBeDefined();
      expect(result.tokenBalances).toHaveLength(1);
      expect(result.tokenBalances[0]?.currency).toBe('SOLO');
    });
  });

  describe('getTransactionHistory', () => {
    it('should get transaction history successfully', async () => {
      const mockResponse = {
        result: {
          transactions: [
            {
              tx: {
                hash: 'test_hash',
                ledger_index: 12345,
                date: 1234567890,
                TransactionType: 'Payment',
                Fee: '12'
              },
              validated: true
            }
          ]
        }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await xrplService.getTransactionHistory('rTestAddress123');

      expect(result).toHaveLength(1);
      expect(result[0].hash).toBe('test_hash');
      expect(result[0].transactionType).toBe('Payment');
    });
  });

  describe('currency conversion', () => {
    it('should convert hex to currency code correctly', () => {
      const result = xrplService.hexToCurrencyCode('534F4C4F00000000000000000000000000000000');
      expect(result).toBe('SOLO');
    });

    it('should return XRP for XRP hex', () => {
      const result = xrplService.hexToCurrencyCode('0000000000000000000000000000000000000000');
      expect(result).toBe('XRP');
    });

    it('should convert currency code to hex correctly', () => {
      const result = xrplService.currencyCodeToHex('SOLO');
      expect(result).toBe('534f4c4f00000000000000000000000000000000');
    });

    it('should return XRP hex for XRP', () => {
      const result = xrplService.currencyCodeToHex('XRP');
      expect(result).toBe('0000000000000000000000000000000000000000');
    });
  });

  describe('healthCheck', () => {
    it('should return connected status when healthy', async () => {
      const mockServerInfo = {
        result: {
          info: {
            time: '2023-01-01T00:00:00Z',
            validated_ledger: { seq: 12345 }
          }
        }
      };

      mockClient.request.mockResolvedValue(mockServerInfo);

      const result = await xrplService.healthCheck();

      expect(result.status).toBe('connected');
      expect(result.details).toBeDefined();
    });

    it('should return disconnected status when unhealthy', async () => {
      mockClient.request.mockRejectedValue(new Error('Connection failed'));

      const result = await xrplService.healthCheck();

      expect(result.status).toBe('disconnected');
      expect(result.details?.error).toBeDefined();
    });
  });
}); 