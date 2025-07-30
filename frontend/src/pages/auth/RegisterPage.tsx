import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Card, CardHeader, CardContent, CardFooter } from '../../components/ui';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  requirements: {
    length: boolean;
    lowercase: boolean;
    uppercase: boolean;
    number: boolean;
    special: boolean;
  };
}

interface RegisterPageProps {
  onRegister?: (data: RegisterFormData) => void;
  onGoogleLogin?: () => void;
  onAppleLogin?: () => void;
  isLoading?: boolean;
  error?: string;
}

const RegisterPage: React.FC<RegisterPageProps> = ({
  onRegister,
  onGoogleLogin,
  onAppleLogin,
  isLoading = false,
  error,
}) => {
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [formErrors, setFormErrors] = useState<Partial<RegisterFormData>>({});
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: 'Very Weak',
    color: 'text-red-500',
    requirements: {
      length: false,
      lowercase: false,
      uppercase: false,
      number: false,
      special: false,
    },
  });

  const checkPasswordStrength = (password: string): PasswordStrength => {
    const requirements = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    const metRequirements = Object.values(requirements).filter(Boolean).length;
    let score = 0;
    let label = 'Very Weak';
    let color = 'text-red-500';

    if (metRequirements >= 5) {
      score = 4;
      label = 'Very Strong';
      color = 'text-green-500';
    } else if (metRequirements >= 4) {
      score = 3;
      label = 'Strong';
      color = 'text-green-600';
    } else if (metRequirements >= 3) {
      score = 2;
      label = 'Medium';
      color = 'text-yellow-500';
    } else if (metRequirements >= 2) {
      score = 1;
      label = 'Weak';
      color = 'text-orange-500';
    }

    return {
      score,
      label,
      color,
      requirements,
    };
  };

  const validateForm = (): boolean => {
    const errors: Partial<RegisterFormData> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (passwordStrength.score < 2) {
      errors.password = 'Password is too weak';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm() && onRegister) {
      onRegister(formData);
    }
  };

  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Update password strength when password changes
    if (field === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getStrengthBarColor = (index: number) => {
    if (index < passwordStrength.score) {
      switch (passwordStrength.score) {
        case 1: return 'bg-red-500';
        case 2: return 'bg-orange-500';
        case 3: return 'bg-yellow-500';
        case 4: return 'bg-green-500';
        default: return 'bg-gray-200';
      }
    }
    return 'bg-gray-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">Create your account</h1>
            <p className="text-neutral-600 mt-2">Join XRPL Multi-Sign Manager</p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Social Login Buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                fullWidth
                onClick={onGoogleLogin}
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                fullWidth
                onClick={onAppleLogin}
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Continue with Apple
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-neutral-500">Or continue with email</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-error-50 border border-error-200 p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-error-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-error-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Register Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="text"
                  label="First name"
                  placeholder="Enter your first name"
                  value={formData.firstName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('firstName', e.target.value)}
                  error={formErrors.firstName}
                  disabled={isLoading}
                />

                <Input
                  type="text"
                  label="Last name"
                  placeholder="Enter your last name"
                  value={formData.lastName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('lastName', e.target.value)}
                  error={formErrors.lastName}
                  disabled={isLoading}
                />
              </div>

              <Input
                type="email"
                label="Email address"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('email', e.target.value)}
                error={formErrors.email}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                }
                disabled={isLoading}
              />

              <div className="space-y-2">
                <Input
                  type="password"
                  label="Password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('password', e.target.value)}
                  error={formErrors.password}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                  disabled={isLoading}
                />

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-2">
                    {/* Strength Bar */}
                    <div className="flex space-x-1">
                      {[0, 1, 2, 3].map((index) => (
                        <div
                          key={index}
                          className={`h-1 flex-1 rounded-full transition-colors duration-200 ${getStrengthBarColor(index)}`}
                        />
                      ))}
                    </div>
                    
                    {/* Strength Label */}
                    <div className="flex items-center justify-between text-sm">
                      <span className={passwordStrength.color}>
                        Password strength: {passwordStrength.label}
                      </span>
                    </div>

                    {/* Requirements List */}
                    <div className="text-xs text-neutral-600 space-y-1">
                      <div className="flex items-center">
                        <svg className={`w-3 h-3 mr-2 ${passwordStrength.requirements.length ? 'text-green-500' : 'text-neutral-400'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        At least 8 characters
                      </div>
                      <div className="flex items-center">
                        <svg className={`w-3 h-3 mr-2 ${passwordStrength.requirements.lowercase ? 'text-green-500' : 'text-neutral-400'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        One lowercase letter
                      </div>
                      <div className="flex items-center">
                        <svg className={`w-3 h-3 mr-2 ${passwordStrength.requirements.uppercase ? 'text-green-500' : 'text-neutral-400'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        One uppercase letter
                      </div>
                      <div className="flex items-center">
                        <svg className={`w-3 h-3 mr-2 ${passwordStrength.requirements.number ? 'text-green-500' : 'text-neutral-400'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        One number
                      </div>
                      <div className="flex items-center">
                        <svg className={`w-3 h-3 mr-2 ${passwordStrength.requirements.special ? 'text-green-500' : 'text-neutral-400'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        One special character (!@#$%^&*)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Input
                type="password"
                label="Confirm password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('confirmPassword', e.target.value)}
                error={formErrors.confirmPassword}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                disabled={isLoading}
              />

              <div className="flex items-start">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded mt-1"
                  required
                />
                <label className="ml-2 text-sm text-neutral-700">
                  I agree to the{' '}
                  <Link to="/terms" className="text-primary-600 hover:text-primary-500">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoading}
                disabled={isLoading || passwordStrength.score < 2}
              >
                Create account
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center">
            <p className="text-sm text-neutral-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage; 