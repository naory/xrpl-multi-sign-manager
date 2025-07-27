import request from 'supertest';
import app from '../../src/app';
import { AuthService } from '../../src/services/AuthService';

// Mock the AuthService
jest.mock('../../src/services/AuthService');
const mockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('AuthController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890'
    };

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: validUserData.email,
        first_name: validUserData.firstName,
        last_name: validUserData.lastName,
        role: 'user',
        status: 'active'
      };

      mockedAuthService.prototype.registerUser.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data).toEqual(mockUser);
    });

    it('should return 400 for invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 400 for weak password', async () => {
      const invalidData = { ...validUserData, password: 'weak' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 409 if user already exists', async () => {
      mockedAuthService.prototype.registerUser.mockRejectedValue(
        new Error('User already exists')
      );

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    const validCredentials = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    };

    it('should login user successfully', async () => {
      const mockLoginResult = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: 'user-123',
          email: validCredentials.email,
          firstName: 'John',
          lastName: 'Doe',
          role: 'user',
          mfaEnabled: false
        },
        expiresIn: 900
      };

      mockedAuthService.prototype.loginUser.mockResolvedValue(mockLoginResult);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validCredentials)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toEqual(mockLoginResult);
    });

    it('should return 400 for invalid email format', async () => {
      const invalidCredentials = { ...validCredentials, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidCredentials)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 401 for invalid credentials', async () => {
      mockedAuthService.prototype.loginUser.mockRejectedValue(
        new Error('Invalid credentials')
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send(validCredentials)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const mockRefreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'user',
          mfaEnabled: false
        },
        expiresIn: 900
      };

      mockedAuthService.prototype.refreshToken.mockResolvedValue(mockRefreshResult);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data).toEqual(mockRefreshResult);
    });

    it('should return 401 for invalid refresh token', async () => {
      mockedAuthService.prototype.refreshToken.mockRejectedValue(
        new Error('Invalid refresh token')
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid refresh token');
    });
  });
}); 