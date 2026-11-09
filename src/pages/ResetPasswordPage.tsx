import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, Brain } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export function ResetPasswordPage() {
  const { confirmPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await confirmPasswordReset(token, password);
      if (error) {
        setError(error.message || 'Failed to reset password');
      } else {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const shell = (content: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 to-white dark:from-secondary-900 dark:to-secondary-800 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <div className="p-2 bg-primary-600 rounded-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-secondary-900 dark:text-white">Career Copilot</span>
        </Link>
        <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-xl p-8">{content}</div>
      </div>
    </div>
  );

  if (!token) {
    return shell(
      <div className="text-center">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white mb-4">Invalid reset link</h1>
        <p className="text-secondary-600 dark:text-secondary-400 mb-6">
          This password reset link is missing its token. Please request a new one.
        </p>
        <Link
          to="/forgot-password"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (success) {
    return shell(
      <div className="text-center">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white mb-4">Password updated</h1>
        <p className="text-secondary-600 dark:text-secondary-400 mb-6">
          Your password has been changed. Redirecting you to the login page...
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Go to login
        </Link>
      </div>
    );
  }

  return shell(
    <>
      <h1 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">Choose a new password</h1>
      <p className="text-secondary-600 dark:text-secondary-400 mb-6">
        Enter a new password for your account.
      </p>

      {error && (
        <Alert variant="error" onClose={() => setError('')} className="mb-6">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="New password"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="w-5 h-5" />}
          required
        />
        <Input
          label="Confirm new password"
          type="password"
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock className="w-5 h-5" />}
          required
        />
        <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
          Reset password
        </Button>
      </form>
    </>
  );
}
