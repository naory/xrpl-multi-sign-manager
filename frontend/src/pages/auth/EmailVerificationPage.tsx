import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '../../components/ui';
import { Button } from '../../components/ui';
import { Loading } from '../../components/ui';

interface EmailVerificationPageProps {
  onResendVerification?: (email: string) => Promise<void>;
}

const EmailVerificationPage: React.FC<EmailVerificationPageProps> = ({
  onResendVerification,
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'expired'>('verifying');
  const [error, setError] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState<string>('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No verification token provided');
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/auth/verify-email/${verificationToken}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        // Extract email from token or store it during verification
        // For now, we'll use a placeholder
        setEmail('your email');
      } else {
        if (data.message.includes('expired')) {
          setStatus('expired');
        } else {
          setStatus('error');
          setError(data.message || 'Verification failed');
        }
      }
    } catch (error) {
      setStatus('error');
      setError('Network error. Please try again.');
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsResending(true);
    setError('');

    try {
      if (onResendVerification) {
        await onResendVerification(email);
        setStatus('verifying');
        setError('');
      } else {
        const response = await fetch('http://localhost:3001/api/auth/resend-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('verifying');
          setError('');
        } else {
          setError(data.message || 'Failed to resend verification email');
        }
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleGoToRegister = () => {
    navigate('/register');
  };

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="text-center">
            <Loading size="lg" />
            <h2 className="text-xl font-semibold text-neutral-900 mt-4">Verifying your email...</h2>
            <p className="text-neutral-600 mt-2">Please wait while we verify your email address.</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Email Verified Successfully!</h2>
            <p className="text-neutral-600 mb-6">
              Your email address has been verified. You can now sign in to your account.
            </p>
            <Button onClick={handleGoToLogin} variant="primary" size="lg" fullWidth>
              Sign In
            </Button>
          </div>
        );

      case 'expired':
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Verification Link Expired</h2>
            <p className="text-neutral-600 mb-6">
              The verification link has expired. Please request a new verification email.
            </p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <Button 
                onClick={handleResendVerification} 
                variant="primary" 
                size="lg" 
                fullWidth
                loading={isResending}
                disabled={isResending}
              >
                Resend Verification Email
              </Button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Verification Failed</h2>
            <p className="text-neutral-600 mb-6">
              {error || 'There was an error verifying your email address.'}
            </p>
            <div className="space-y-3">
              <Button onClick={handleGoToRegister} variant="outline" size="lg" fullWidth>
                Create New Account
              </Button>
              <Button onClick={handleGoToLogin} variant="primary" size="lg" fullWidth>
                Sign In
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">Email Verification</h1>
            <p className="text-neutral-600 mt-2">Verify your email address to continue</p>
          </CardHeader>

          <CardContent>
            {renderContent()}
          </CardContent>

          <CardFooter className="justify-center">
            <p className="text-sm text-neutral-600">
              Need help?{' '}
              <a href="mailto:support@xrpl-manager.com" className="text-primary-600 hover:text-primary-500">
                Contact Support
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default EmailVerificationPage; 