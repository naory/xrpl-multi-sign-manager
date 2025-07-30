import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout, Header, Sidebar, Main } from './components/layout/Layout';
import { Navigation, MobileMenu } from './components/navigation/Navigation';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import EmailVerificationPage from './pages/auth/EmailVerificationPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import './index.css';

// Mock data for demonstration
const mockStats = {
  totalWallets: 12,
  activeWallets: 8,
  pendingTransactions: 3,
  totalValue: '$45,230.50',
};

const mockRecentActivity = [
  {
    id: '1',
    type: 'transaction' as const,
    title: 'Payment to Supplier A',
    description: 'Multi-signature transaction completed',
    timestamp: '2 hours ago',
    status: 'completed' as const,
  },
  {
    id: '2',
    type: 'wallet_created' as const,
    title: 'New Wallet Created',
    description: 'Treasury wallet setup completed',
    timestamp: '1 day ago',
    status: 'completed' as const,
  },
  {
    id: '3',
    type: 'signer_added' as const,
    title: 'Signer Added',
    description: 'John Doe added to Operations wallet',
    timestamp: '2 days ago',
    status: 'completed' as const,
  },
];

const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
      </svg>
    ),
    isActive: true,
  },
  {
    id: 'wallets',
    label: 'Wallets',
    href: '/wallets',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
  },
  {
    id: 'transactions',
    label: 'Transactions',
    href: '/transactions',
    badge: '3',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const mockUser = {
  name: 'John Doe',
  email: 'john.doe@company.com',
  avatar: undefined,
};

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (data: { email: string; password: string }) => {
    setIsLoading(true);
    setError(undefined);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock authentication logic
      if (data.email === 'demo@example.com' && data.password === 'password') {
        setIsAuthenticated(true);
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: { firstName: string; lastName: string; email: string; password: string; confirmPassword: string }) => {
    setIsLoading(true);
    setError(undefined);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock registration logic
      if (data.email && data.password && data.firstName && data.lastName) {
        // Show success message and redirect to login
        alert(`Registration successful! Please check your email (${data.email}) for a verification link.`);
        // Redirect to login page after user clicks OK
        navigate('/login');
      } else {
        setError('Please fill in all required fields');
      }
    } catch (err) {
      setError('An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(undefined);
    
    try {
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsAuthenticated(true);
    } catch (err) {
      setError('Google login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setIsLoading(true);
    setError(undefined);
    
    try {
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsAuthenticated(true);
    } catch (err) {
      setError('Apple login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleCreateWallet = () => {
    // Navigate to wallet creation
    console.log('Create wallet clicked');
  };

  const handleViewWallets = () => {
    // Navigate to wallets page
    console.log('View wallets clicked');
  };

  const handleViewTransactions = () => {
    // Navigate to transactions page
    console.log('View transactions clicked');
  };

  // Logo component
  const Logo = () => (
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <span className="text-xl font-bold text-neutral-900">XRPL Coordinator</span>
    </div>
  );

  // Protected Route component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
  };

  return (
    <div className="App">
        {isAuthenticated ? (
          <Layout>
            <Header>
              <Navigation
                items={navigationItems}
                logo={<Logo />}
                user={mockUser}
                onLogout={handleLogout}
              />
              {/* Mobile menu button */}
              <button
                className="lg:hidden absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
                onClick={() => setMobileMenuOpen(true)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </Header>

            <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
              <div className="p-6">
                <Logo />
                <nav className="mt-8 space-y-2">
                  {navigationItems.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        item.isActive
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                          {item.badge}
                        </span>
                      )}
                    </a>
                  ))}
                </nav>
              </div>
            </Sidebar>

            <Main>
              <div className="p-6">
                <Routes>
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardPage
                          stats={mockStats}
                          recentActivity={mockRecentActivity}
                          onCreateWallet={handleCreateWallet}
                          onViewWallets={handleViewWallets}
                          onViewTransactions={handleViewTransactions}
                        />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/wallets"
                    element={
                      <ProtectedRoute>
                        <div className="text-center py-12">
                          <h1 className="text-2xl font-bold text-neutral-900 mb-4">Wallets</h1>
                          <p className="text-neutral-600">Wallet management coming soon...</p>
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/transactions"
                    element={
                      <ProtectedRoute>
                        <div className="text-center py-12">
                          <h1 className="text-2xl font-bold text-neutral-900 mb-4">Transactions</h1>
                          <p className="text-neutral-600">Transaction management coming soon...</p>
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <div className="text-center py-12">
                          <h1 className="text-2xl font-bold text-neutral-900 mb-4">Settings</h1>
                          <p className="text-neutral-600">Settings page coming soon...</p>
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </Main>

            <MobileMenu
              isOpen={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
              items={navigationItems}
              user={mockUser}
              onLogout={handleLogout}
            />
          </Layout>
        ) : (
          <Routes>
            <Route
              path="/login"
              element={
                <LoginPage
                  onLogin={handleLogin}
                  onGoogleLogin={handleGoogleLogin}
                  onAppleLogin={handleAppleLogin}
                  isLoading={isLoading}
                  error={error}
                  clearError={() => setError(undefined)}
                />
              }
            />
            <Route
              path="/register"
              element={
                <RegisterPage
                  onRegister={handleRegister}
                  onGoogleLogin={handleGoogleLogin}
                  onAppleLogin={handleAppleLogin}
                  isLoading={isLoading}
                  error={error}
                />
              }
            />
            <Route
              path="/verify-email"
              element={
                <EmailVerificationPage />
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App; 