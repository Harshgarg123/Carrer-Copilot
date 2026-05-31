import React, { useState } from 'react';
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

export function Sidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        'fixed left-0 top-16 bottom-0 bg-white dark:bg-secondary-800 border-r border-secondary-200 dark:border-secondary-700 transition-all duration-300 z-40 overflow-hidden',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="h-full flex flex-col">
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 hover:text-secondary-900 dark:hover:text-white'
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Settings link */}
        <div className="px-2 py-4 border-t border-secondary-200 dark:border-secondary-700">
          <Link
            to="/dashboard/settings"
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 hover:text-secondary-900 dark:hover:text-white transition-all duration-200',
              location.pathname === '/dashboard/settings' && 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
            )}
            title={isCollapsed ? 'Settings' : undefined}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </Link>
        </div>

        {/* Collapse button */}
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
