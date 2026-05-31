import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Target,
  FileEdit,
  MessageSquare,
  TrendingUp,
  Map,
  Github,
  FolderGit2,
  HelpCircle,
  MessageCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Brain,
} from 'lucide-react';
import { clsx } from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Resume Analysis', href: '/dashboard/resume', icon: FileText },
  { name: 'Job Match', href: '/dashboard/job-match', icon: Target },
  { name: 'Cover Letter', href: '/dashboard/cover-letter', icon: FileEdit },
  { name: 'Mock Interview', href: '/dashboard/interview', icon: MessageSquare },
  { name: 'Skill Gap', href: '/dashboard/skill-gap', icon: TrendingUp },
  { name: 'Learning Roadmap', href: '/dashboard/roadmap', icon: Map },
  { name: 'GitHub Analysis', href: '/dashboard/github', icon: Github },
  { name: 'Project Analyzer', href: '/dashboard/project', icon: FolderGit2 },
  { name: 'Question Generator', href: '/dashboard/questions', icon: HelpCircle },
  { name: 'AI Mentor', href: '/dashboard/mentor', icon: MessageCircle },
];

// Shared NavLinks used by both desktop and mobile sidebar
function NavLinks({
  collapsed,
  onLinkClick,
}: {
  collapsed?: boolean;
  onLinkClick?: () => void;
}) {
  const location = useLocation();

  return (
    <>
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onLinkClick}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 hover:text-secondary-900 dark:hover:text-white'
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Settings link */}
      <div className="px-2 py-4 border-t border-secondary-200 dark:border-secondary-700">
        <Link
          to="/dashboard/settings"
          onClick={onLinkClick}
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 hover:text-secondary-900 dark:hover:text-white transition-all duration-200',
            location.pathname === '/dashboard/settings' &&
              'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
          )}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </>
  );
}

// ── Desktop sidebar (hidden on mobile) ──────────────────────────────────────
function DesktopSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        'hidden md:flex fixed left-0 top-16 bottom-0 bg-white dark:bg-secondary-800 border-r border-secondary-200 dark:border-secondary-700 transition-all duration-300 z-40 overflow-hidden flex-col',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="h-full flex flex-col">
        <NavLinks collapsed={isCollapsed} />

        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-secondary-700 border border-secondary-200 dark:border-secondary-600 rounded-full shadow-sm flex items-center justify-center hover:bg-secondary-50 dark:hover:bg-secondary-600 transition-colors z-10"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
          )}
        </button>
      </div>
    </aside>
  );
}

// ── Mobile drawer + FAB ──────────────────────────────────────────────────────
function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Floating Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed bottom-6 left-4 z-50 w-13 h-13 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white rounded-2xl shadow-lg shadow-primary-600/40 flex items-center justify-center transition-all duration-200"
        aria-label="Open navigation"
        style={{ width: 52, height: 52 }}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Backdrop overlay */}
      <div
        className={clsx(
          'md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-over drawer */}
      <div
        className={clsx(
          'md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-white dark:bg-secondary-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Navigation drawer"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary-600 rounded-lg">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-secondary-900 dark:text-white">
              Career Copilot
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
          </button>
        </div>

        {/* Nav links */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <NavLinks onLinkClick={() => setIsOpen(false)} />
        </div>
      </div>
    </>
  );
}

// ── Exported composite ───────────────────────────────────────────────────────
export function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
}