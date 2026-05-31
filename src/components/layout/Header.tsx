import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Brain, Menu, X, Sun, Moon, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/Button';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isLandingPage = location.pathname === '/';

  const handleSignOut = async () => {
    setIsProfileOpen(false);
    setIsMenuOpen(false);
    await signOut();
    navigate('/');
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (user) {
      // Use navigate instead of Link to ensure proper routing
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  const handleDashboardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setIsProfileOpen(false);
    setIsMenuOpen(false);
    navigate('/dashboard');
  };

  // Debug logging to help identify the issue
  useEffect(() => {
    console.log('Current user:', user);
    console.log('Current path:', location.pathname);
  }, [user, location.pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-lg border-b border-secondary-200 dark:border-secondary-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Fixed navigation */}
          <a 
            href={user ? '/dashboard' : '/'} 
            onClick={handleLogoClick}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            role="button"
            aria-label="Go to home"
          >
            <div className="p-2 bg-primary-600 rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-secondary-900 dark:text-white">
              Career Copilot
            </span>
          </a>

          {/* Desktop Navigation */}
          {isLandingPage && !user && (
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-white transition-colors">
                How It Works
              </a>
              <a href="#pricing" className="text-sm text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-white transition-colors">
                Pricing
              </a>
            </nav>
          )}

          {/* Right section */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              ) : (
                <Sun className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              )}
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
                >
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                      {user.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </button>

                {isProfileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsProfileOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 py-1 z-50 animate-slide-down">
                      <a
                        href="/dashboard"
                        onClick={handleDashboardClick}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </a>
                      <Link
                        to="/dashboard/settings"
                        onClick={() => {
                          setIsProfileOpen(false);
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-secondary-100 dark:hover:bg-secondary-700"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
                <Button onClick={() => navigate('/signup')}>
                  Get started
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              ) : (
                <Menu className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-secondary-200 dark:border-secondary-700 animate-slide-down">
            {user ? (
              <div className="space-y-2">
                <a
                  href="/dashboard"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsMenuOpen(false);
                    navigate('/dashboard');
                  }}
                  className="block px-4 py-2 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg cursor-pointer"
                >
                  Dashboard
                </a>
                <Link
                  to="/dashboard/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-2 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg"
                >
                  Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-error-600 dark:text-error-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button variant="ghost" onClick={() => { setIsMenuOpen(false); navigate('/login'); }} className="w-full">
                  Sign in
                </Button>
                <Button onClick={() => { setIsMenuOpen(false); navigate('/signup'); }} className="w-full">
                  Get started
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}