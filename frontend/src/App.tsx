import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'

// Import pages (to be created)
import Dashboard from './pages/dashboard/Dashboard'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import WalletList from './pages/wallets/WalletList'
import WalletDetail from './pages/wallets/WalletDetail'
import TransactionList from './pages/transactions/TransactionList'
import AdminDashboard from './pages/admin/AdminDashboard'

// Import components (to be created)
import Layout from './components/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Create a client
const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="wallets" element={<WalletList />} />
              <Route path="wallets/:id" element={<WalletDetail />} />
              <Route path="transactions" element={<TransactionList />} />
              <Route path="admin" element={<AdminDashboard />} />
            </Route>
          </Routes>
          
          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App 