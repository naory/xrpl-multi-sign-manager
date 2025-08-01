import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Container, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, useTheme, useMediaQuery } from '@mui/material';
import { Menu as MenuIcon, Dashboard, AccountBalanceWallet, Receipt, Settings, Person } from '@mui/icons-material';
import { useAuthStore } from './stores/auth';
import { useUIStore } from './stores/ui';
import { lightTheme, darkTheme } from './theme';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import EmailVerificationPage from './pages/auth/EmailVerificationPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import NotificationSystem from './components/ui/NotificationSystem';

// Navigation items
const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: <Dashboard />,
  },
  {
    id: 'wallets',
    label: 'Wallets',
    href: '/wallets',
    icon: <AccountBalanceWallet />,
  },
  {
    id: 'transactions',
    label: 'Transactions',
    href: '/transactions',
    icon: <Receipt />,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: <Settings />,
  },
];

function AppContent() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Zustand stores
  const { isAuthenticated, user, logout } = useAuthStore();
  const { sidebarOpen, mobileMenuOpen, setSidebarOpen, setMobileMenuOpen, toggleMobileMenu } = useUIStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (href: string) => {
    navigate(href);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const Logo = () => (
    <Typography variant="h6" component="div" sx={{ fontWeight: 700, color: 'primary.main' }}>
      XRPL Multi-Sign Manager
    </Typography>
  );

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  };

  const SidebarContent = () => (
    <Box sx={{ width: 280, p: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Logo />
      </Box>
      
      <List>
        {navigationItems.map((item) => (
          <ListItem
            key={item.id}
            component="div"
            onClick={() => handleNavigation(item.href)}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'primary.main' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  if (!isAuthenticated) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email/:token" element={<EmailVerificationPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${sidebarOpen ? 280 : 0}px)` },
          ml: { md: `${sidebarOpen ? 280 : 0}px` },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={isMobile ? toggleMobileMenu : () => setSidebarOpen(!sidebarOpen)}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {navigationItems.find(item => window.location.pathname.startsWith(item.href))?.label || 'Dashboard'}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <Person />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={isMobile ? mobileMenuOpen : sidebarOpen}
        onClose={isMobile ? () => setMobileMenuOpen(false) : undefined}
        sx={{
          width: 280,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            top: 0,
            height: '100%',
          },
        }}
      >
        <SidebarContent />
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${sidebarOpen ? 280 : 0}px)` },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        <Container maxWidth="xl" sx={{ p: 3 }}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallets"
              element={
                <ProtectedRoute>
                  <Box>
                    <Typography variant="h4" gutterBottom>
                      Wallets
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Wallet management page coming soon...
                    </Typography>
                  </Box>
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <Box>
                    <Typography variant="h4" gutterBottom>
                      Transactions
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Transaction management page coming soon...
                    </Typography>
                  </Box>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Box>
                    <Typography variant="h4" gutterBottom>
                      Settings
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Settings page coming soon...
                    </Typography>
                  </Box>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Container>
      </Box>
    </Box>
  );
}

function App() {
  const { darkMode } = useUIStore();
  const theme = darkMode ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppContent />
        <NotificationSystem />
      </Router>
    </ThemeProvider>
  );
}

export default App; 