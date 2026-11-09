import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Target,
  MessageSquare,
  TrendingUp,
  Brain,
  Clock,
  Award,
} from 'lucide-react';
import { dashboardApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/Progress';
import { Skeleton } from '../components/ui/Spinner';
import { Alert } from '../components/ui/Alert';

interface UserActivity {
  id: string;
  activity_type: string;
  title: string;
  created_at: string;
}

interface CareerStats {
  resume_score: number;
  ats_score: number;
  job_readiness: number;
  interview_score: number;
  skills_improved: number;
  learning_progress: number;
  total_interviews: number;
  total_resumes: number;
  total_cover_letters: number;
}

const quickActions = [
  { icon: FileText, title: 'Resume Analysis', href: '/dashboard/resume', color: 'bg-primary-100 dark:bg-primary-900/30' },
  { icon: Target, title: 'Job Match', href: '/dashboard/job-match', color: 'bg-accent-100 dark:bg-accent-900/30' },
  { icon: MessageSquare, title: 'Mock Interview', href: '/dashboard/interview', color: 'bg-success-100 dark:bg-success-900/30' },
  { icon: Brain, title: 'AI Mentor', href: '/dashboard/mentor', color: 'bg-warning-100 dark:bg-warning-900/30' },
];

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CareerStats | null>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Stats are computed live on the server from the MongoDB collections
        const { data, error: dashboardError } = await dashboardApi.get();
        if (dashboardError || !data) throw new Error(dashboardError || 'Failed to load dashboard data');

        setActivities(data.activities || []);
        setStats(data.stats);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
        setError(errorMessage);
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-8 px-3 sm:px-0">
        <Skeleton className="h-8 sm:h-10 w-48 sm:w-64 mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 sm:h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 sm:h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8 pb-20 sm:pb-0">
      {error && (
        <Alert variant="error" onClose={() => setError('')} className="mx-3 sm:mx-0">
          {error}
        </Alert>
      )}

      {/* Welcome Section - Mobile Optimized */}
      <div className="px-3 sm:px-0">
        <h1 className="text-xl sm:text-3xl font-bold text-secondary-900 dark:text-white mb-1 sm:mb-2">
          Welcome back, {user?.full_name ||
                     user?.email?.split('@')[0] ||
                     'User'}!
        </h1>
        <p className="text-sm sm:text-base text-secondary-600 dark:text-secondary-400">
          Here's an overview of your career progress
        </p>
      </div>

      {/* Stats Grid - Mobile: 2 columns, Tablet+: 4 columns */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 px-3 sm:px-0">
        <Card className="p-0">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <span className="text-[10px] sm:text-xs text-secondary-500">Resume Score</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white mb-1">
              {stats?.resume_score ?? 0}%
            </div>
            <Progress value={stats?.resume_score ?? 0} size="sm" />
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-accent-100 dark:bg-accent-900/30 rounded-lg">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-accent-600 dark:text-accent-400" />
              </div>
              <span className="text-[10px] sm:text-xs text-secondary-500">ATS Score</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white mb-1">
              {stats?.ats_score ?? 0}%
            </div>
            <Progress value={stats?.ats_score ?? 0} size="sm" variant="accent" />
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-success-600 dark:text-success-400" />
              </div>
              <span className="text-[10px] sm:text-xs text-secondary-500">Interview Score</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white mb-1">
              {stats?.interview_score ?? 0}%
            </div>
            <Progress value={stats?.interview_score ?? 0} size="sm" variant="success" />
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-warning-600 dark:text-warning-400" />
              </div>
              <span className="text-[10px] sm:text-xs text-secondary-500">Skills Improved</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white mb-1">
              {stats?.skills_improved ?? 0}%
            </div>
            <Progress value={stats?.skills_improved ?? 0} size="sm" variant="warning" />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Activity - Mobile: stacked, Desktop: side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 px-3 sm:px-0">
        {/* Quick Actions - Mobile: grid layout */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {quickActions.map((action, i) => (
                <Link key={i} to={action.href}>
                  <div className="p-3 sm:p-4 rounded-xl bg-secondary-50 dark:bg-secondary-900 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors group cursor-pointer">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 ${action.color} rounded-lg flex items-center justify-center mb-2 sm:mb-3`}>
                      <action.icon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-secondary-900 dark:text-white">
                      {action.title}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity - Mobile: full width, fixed height */}
        <Card className="lg:col-span-2 h-[400px] sm:h-[500px]">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px] sm:h-[420px] overflow-y-auto">
            {activities.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
                <p className="text-sm sm:text-base text-secondary-600 dark:text-secondary-400 mb-4">
                  No recent activity yet
                </p>
                <Link to="/dashboard/resume">
                  <Button size="sm" className="text-sm">Get Started</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-colors"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                      <Award className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-secondary-900 dark:text-white break-words">
                        {activity.title}
                      </p>
                      <p className="text-[10px] sm:text-xs text-secondary-500 dark:text-secondary-400">
                        {new Date(activity.created_at).toLocaleDateString()} at{' '}
                        {new Date(activity.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Career Insights - Mobile optimized */}
      <Card className="mx-3 sm:mx-0">
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            Career Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
            <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-xl">
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-1">
                {stats?.job_readiness ?? 0}%
              </div>
              <div className="text-xs sm:text-sm text-secondary-600 dark:text-secondary-400">Job Readiness</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
              <div className="text-2xl sm:text-3xl font-bold text-secondary-900 dark:text-white mb-1">
                {stats?.total_interviews ?? 0}
              </div>
              <div className="text-xs sm:text-sm text-secondary-600 dark:text-secondary-400">Mock Interviews</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
              <div className="text-2xl sm:text-3xl font-bold text-secondary-900 dark:text-white mb-1">
                {stats?.total_resumes ?? 0}
              </div>
              <div className="text-xs sm:text-sm text-secondary-600 dark:text-secondary-400">Resumes Analyzed</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}