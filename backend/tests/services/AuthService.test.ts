import { AuthService } from '../../src/services/AuthService';
import User from '../../src/models/User';
import bcrypt from 'bcrypt';

// Mock the User model
jest.mock('../../src/models/User');
const mockedUser = User as jest.Mocked<typeof User>;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    const mockUserData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890'
    };

    it('should register a new user successfully', async () => {
      // Mock that user doesn't exist
      mockedUser.findOne.mockResolvedValue(null);
      
      // Mock user creation
      const mockUser = {
        id: 'user-123',
        email: mockUserData.email,
        first_name: mockUserData.firstName,
        last_name: mockUserData.lastName,
        phone: mockUserData.phone,
        status: 'active',
        role: 'user'
      };
      mockedUser.create.mockResolvedValue(mockUser as any);

      const result = await authService.registerUser(mockUserData);

      expect(mockedUser.findOne).toHaveBeenCalledWith({
        where: { email: mockUserData.email }
      });
      expect(mockedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockUserData.email,
          first_name: mockUserData.firstName,
          last_name: mockUserData.lastName,
          phone: mockUserData.phone,
          status: 'active'
        })
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user already exists', async () => {
      // Mock that user exists
      mockedUser.findOne.mockResolvedValue({ id: 'existing-user' } as any);

      await expect(authService.registerUser(mockUserData)).rejects.toThrow(
        'User already exists'
      );
    });

    it('should hash password before creating user', async () => {
      mockedUser.findOne.mockResolvedValue(null);
      const mockUser = { id: 'user-123' };
      mockedUser.create.mockResolvedValue(mockUser as any);

      await authService.registerUser(mockUserData);

      expect(mockedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: expect.any(String)
        })
      );

      // Verify password was hashed
      const createCall = mockedUser.create.mock.calls[0][0];
      const isHashed = await bcrypt.compare(mockUserData.password, createCall.password_hash);
      expect(isHashed).toBe(true);
    });
  });

  describe('loginUser', () => {
    const mockCredentials = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    };

    it('should login user successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash(mockCredentials.password, 12);
      const mockUser = {
        id: 'user-123',
        email: mockCredentials.email,
        password_hash: hashedPassword,
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        mfa_enabled: false,
        status: 'active'
      };

      mockedUser.findOne.mockResolvedValue(mockUser as any);

      const result = await authService.loginUser(mockCredentials.email, mockCredentials.password);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('expiresIn');
      expect(result.user.email).toBe(mockCredentials.email);
    });

    it('should throw error for non-existent user', async () => {
      mockedUser.findOne.mockResolvedValue(null);

      await expect(
        authService.loginUser(mockCredentials.email, mockCredentials.password)
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for invalid password', async () => {
      const hashedPassword = await bcrypt.hash('different-password', 12);
      const mockUser = {
        id: 'user-123',
        email: mockCredentials.email,
        password_hash: hashedPassword
      };

      mockedUser.findOne.mockResolvedValue(mockUser as any);

      await expect(
        authService.loginUser(mockCredentials.email, mockCredentials.password)
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for inactive user', async () => {
      const hashedPassword = await bcrypt.hash(mockCredentials.password, 12);
      const mockUser = {
        id: 'user-123',
        email: mockCredentials.email,
        password_hash: hashedPassword,
        status: 'inactive'
      };

      mockedUser.findOne.mockResolvedValue(mockUser as any);

      await expect(
        authService.loginUser(mockCredentials.email, mockCredentials.password)
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('password validation', () => {
    it('should validate strong passwords', () => {
      const strongPassword = 'StrongPass123!';
      expect(authService.validatePasswordStrength(strongPassword)).toBe(true);
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'weak', // too short
        'weakpassword', // no uppercase, numbers, or special chars
        'WEAKPASSWORD', // no lowercase, numbers, or special chars
        'WeakPassword', // no numbers or special chars
        'WeakPass123' // no special chars
      ];

      weakPasswords.forEach(password => {
        expect(authService.validatePasswordStrength(password)).toBe(false);
      });
    });
  });
}); 