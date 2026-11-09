import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Brain } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        setError(error.message || 'Failed to create account');
      } else {
        setSuccessMessage('Account created successfully! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 1500);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image/Decoration */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary-600 to-accent-600 items-center justify-center p-12">
        <div className="max-w-xl text-white">
          <h2 className="text-4xl font-bold mb-6">Start Your Journey Today</h2>
          <div className="space-y-4">
            {[
              'Upload your resume for AI analysis',
              'Practice interviews with our AI mentor',
              'Get personalized career recommendations',
              'Track your progress over time',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-lg">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 bg-white dark:bg-secondary-900">
        <div className="w-full max-w-md mx-auto">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="p-2 bg-primary-600 rounded-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-secondary-900 dark:text-white">Career Copilot</span>
          </Link>

          <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
            Create your account
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400 mb-8">
            Join thousands of developers accelerating their careers
          </p>

          {error && (
            <Alert variant="error" onClose={() => setError('')} className="mb-6">
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert variant="success" className="mb-6">
              {successMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Full name"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<User className="w-5 h-5" />}
              required
            />

            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-5 h-5" />}
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-5 h-5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
                helperText="At least 6 characters"
                required
              />
            </div>

            <Input
              label="Confirm password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="w-5 h-5" />}
              required
            />

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                className="mt-1 w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                required
              />
              <label htmlFor="terms" className="text-sm text-secondary-600 dark:text-secondary-400">
                I agree to the{' '}
                <a href="#" className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
                  Privacy Policy
                </a>
              </label>
            </div>

            <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
              Create account
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-secondary-600 dark:text-secondary-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
