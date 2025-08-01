import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin' | 'super_admin';
  emailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthState {
  // State
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: 'google' | 'apple') => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Mock user database for development
interface MockUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: 'user' | 'admin' | 'super_admin';
  emailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Initialize with demo user
const mockUsers: MockUser[] = [
  {
    id: '1',
    email: 'demo@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'password',
    role: 'user',
    emailVerified: true,
    mfaEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // TODO: Replace with actual API call
          // const response = await authAPI.login(email, password);
          
          // Mock API call for now
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Find user in mock database
          const mockUser = mockUsers.find(user => user.email === email);
          
          if (mockUser && mockUser.password === password) {
            const user: User = {
              id: mockUser.id,
              email: mockUser.email,
              firstName: mockUser.firstName,
              lastName: mockUser.lastName,
              role: mockUser.role,
              emailVerified: mockUser.emailVerified,
              mfaEnabled: mockUser.mfaEnabled,
              createdAt: mockUser.createdAt,
              updatedAt: mockUser.updatedAt,
            };
            
            const mockTokens: AuthTokens = {
              accessToken: `mock-access-token-${mockUser.id}`,
              refreshToken: `mock-refresh-token-${mockUser.id}`,
              expiresAt: Date.now() + 3600000, // 1 hour
            };
            
            set({
              user,
              tokens: mockTokens,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error('Invalid email or password');
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },

      loginWithOAuth: async (provider: 'google' | 'apple') => {
        set({ isLoading: true, error: null });
        
        try {
          // TODO: Replace with actual OAuth flow
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const mockUser: User = {
            id: '1',
            email: `user@${provider}.com`,
            firstName: 'OAuth',
            lastName: 'User',
            role: 'user',
            emailVerified: true,
            mfaEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          const mockTokens: AuthTokens = {
            accessToken: `mock-${provider}-access-token`,
            refreshToken: `mock-${provider}-refresh-token`,
            expiresAt: Date.now() + 3600000,
          };
          
          set({
            user: mockUser,
            tokens: mockTokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: `${provider} login failed`,
          });
          throw error;
        }
      },

      register: async (userData: RegisterData) => {
        set({ isLoading: true, error: null });
        
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (userData.password !== userData.confirmPassword) {
            throw new Error('Passwords do not match');
          }
          
          // Check if user already exists
          const existingUser = mockUsers.find(user => user.email === userData.email);
          if (existingUser) {
            throw new Error('User with this email already exists');
          }
          
          // Create new user
          const newUser: MockUser = {
            id: (mockUsers.length + 1).toString(),
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            password: userData.password,
            role: 'user',
            emailVerified: false, // Would be false until email verification
            mfaEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          // Add to mock database
          mockUsers.push(newUser);
          
          // Mock successful registration
          // In real implementation, this would redirect to email verification
          set({ isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Registration failed',
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      refreshToken: async () => {
        const { tokens } = get();
        if (!tokens) return;
        
        try {
          // TODO: Replace with actual token refresh API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const newTokens: AuthTokens = {
            accessToken: 'new-mock-access-token',
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + 3600000,
          };
          
          set({ tokens: newTokens });
        } catch (error) {
          // If refresh fails, logout the user
          get().logout();
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setUser: (user: User) => {
        set({ user });
      },

      updateUser: (updates: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },

      // Debug function to see registered users (remove in production)
      getMockUsers: () => {
        console.log('Registered users:', mockUsers.map(u => ({ email: u.email, firstName: u.firstName, lastName: u.lastName })));
        return mockUsers;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
); 