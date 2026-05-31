import React, { useEffect, useState } from 'react';
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
import { supabase } from '../lib/supabase';
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

/** Compute career stats directly from source tables — used as fallback
 *  when the career_stats row exists but is all zeros (trigger not yet run),
 *  or as a real-time refresh after an activity is recorded. */
async function computeStatsFromSourceTables(userId: string): Promise<CareerStats> {
  const [
    resumesRes,
    interviewsRes,
    coverLettersRes,
    roadmapsRes,
    skillGapsRes,
  ] = await Promise.all([
    supabase.from('resumes').select('score, ats_score').eq('user_id', userId),
    supabase.from('mock_interviews').select('total_score').eq('user_id', userId).eq('status', 'completed'),
    supabase.from('cover_letters').select('id').eq('user_id', userId),
    supabase.from('learning_roadmaps').select('id').eq('user_id', userId),
    supabase.from('skill_gap_analyses').select('id').eq('user_id', userId),
  ]);

  // Handle potential errors silently - use empty arrays if error
  const resumes = resumesRes.error ? [] : (resumesRes.data || []);
  const interviews = interviewsRes.error ? [] : (interviewsRes.data || []);
  const coverLetters = coverLettersRes.error ? [] : (coverLettersRes.data || []);
  const roadmaps = roadmapsRes.error ? [] : (roadmapsRes.data || []);
  const skillGaps = skillGapsRes.error ? [] : (skillGapsRes.data || []);

  const resume_score = resumes.length
    ? Math.max(...resumes.map(r => r.score || 0))
    : 0;
  const ats_score = resumes.length
    ? Math.max(...resumes.map(r => r.ats_score || 0))
    : 0;
  const interview_score = interviews.length
    ? Math.round(interviews.reduce((sum, i) => sum + (i.total_score || 0), 0) / interviews.length)
    : 0;
  const learning_progress = Math.min(roadmaps.length * 20 + skillGaps.length * 10, 100);
  const skills_improved = Math.min(skillGaps.length * 10, 100);
  const job_readiness = Math.min(Math.round(
    (resume_score * 0.35) +
    (ats_score * 0.25) +
    (interview_score * 0.25) +
    Math.min(coverLetters.length * 10, 15)
  ), 100);

  return {
    resume_score,
    ats_score,
    job_readiness,
    interview_score,
    skills_improved,
    learning_progress,
    total_interviews: interviews.length,
    total_resumes: resumes.length,
    total_cover_letters: coverLetters.length,
  };
}

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
        const [statsResult, activitiesResult] = await Promise.all([
          supabase
            .from('career_stats')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('user_activities')
            .select('id, activity_type, title, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        if (statsResult.error) throw new Error(statsResult.error.message);
        if (activitiesResult.error) throw new Error(activitiesResult.error.message);

        setActivities(activitiesResult.data || []);

        const stored = statsResult.data;
        
        // Check if stats exist and have meaningful data
        const needsComputation = !stored || (
          stored.resume_score === 0 &&
          stored.ats_score === 0 &&
          stored.total_resumes === 0 &&
          stored.total_cover_letters === 0 &&
          stored.total_interviews === 0
        );

        if (needsComputation) {
          // Compute live from source tables
          const computed = await computeStatsFromSourceTables(user.id);
          setStats(computed);

          // Persist computed values back to database if a record exists
          if (stored?.id) {
            const { error: updateError } = await supabase
              .from('career_stats')
              .update({ 
                ...computed, 
                updated_at: new Date().toISOString() 
              })
              .eq('user_id', user.id);
              
            if (updateError) {
              console.error('Failed to update career_stats:', updateError);
            }
          } else if (!stored) {
            // Create a new record if none exists
            const { error: insertError } = await supabase
              .from('career_stats')
              .insert({ 
                user_id: user.id,
                ...computed,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (insertError) {
              console.error('Failed to insert career_stats:', insertError);
            }
          }
        } else {
          setStats(stored);
        }
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
      <div className="space-y-8">
        <Skeleton className="h-10 w-64 mb-2" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <Alert variant="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
          Welcome back, {user?.user_metadata?.full_name || 
                     user?.user_metadata?.name ||
                     user?.email?.split('@')[0] || 
                     'User'}!
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Here's an overview of your career progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <span className="text-xs text-secondary-500">Resume Score</span>
            </div>
            <div className="text-2xl font-bold text-secondary-900 dark:text-white mb-1">
              {stats?.resume_score ?? 0}%
            </div>
            <Progress value={stats?.resume_score ?? 0} size="sm" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-accent-100 dark:bg-accent-900/30 rounded-lg">
                <Target className="w-5 h-5 text-accent-600 dark:text-accent-400" />
              </div>
              <span className="text-xs text-secondary-500">ATS Score</span>
            </div>
            <div className="text-2xl font-bold text-secondary-900 dark:text-white mb-1">
              {stats?.ats_score ?? 0}%
            </div>
            <Progress value={stats?.ats_score ?? 0} size="sm" variant="accent" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
                <MessageSquare className="w-5 h-5 text-success-600 dark:text-success-400" />
              </div>
              <span className="text-xs text-secondary-500">Interview Score</span>
            </div>
            <div className="text-2xl font-bold text-secondary-900 dark:text-white mb-1">
              {stats?.interview_score ?? 0}%
            </div>
            <Progress value={stats?.interview_score ?? 0} size="sm" variant="success" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-warning-600 dark:text-warning-400" />
              </div>
              <span className="text-xs text-secondary-500">Skills Improved</span>
            </div>
            <div className="text-2xl font-bold text-secondary-900 dark:text-white mb-1">
              {stats?.skills_improved ?? 0}%
            </div>
            <Progress value={stats?.skills_improved ?? 0} size="sm" variant="warning" />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, i) => (
                <Link key={i} to={action.href}>
                  <div className="p-4 rounded-xl bg-secondary-50 dark:bg-secondary-900 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors group cursor-pointer">
                    <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                      <action.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-sm font-medium text-secondary-900 dark:text-white">
                      {action.title}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2 h-[500px]">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="h-[420px] overflow-y-auto">
            {activities.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  No recent activity yet
                </p>
                <Link to="/dashboard/resume">
                  <Button>Get Started</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary-900 dark:text-white">
                        {activity.title}
                      </p>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400">
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

      {/* Career Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Career Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-xl">
              <div className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-1">
                {stats?.job_readiness ?? 0}%
              </div>
              <div className="text-sm text-secondary-600 dark:text-secondary-400">Job Readiness</div>
            </div>
            <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
              <div className="text-3xl font-bold text-secondary-900 dark:text-white mb-1">
                {stats?.total_interviews ?? 0}
              </div>
              <div className="text-sm text-secondary-600 dark:text-secondary-400">Mock Interviews</div>
            </div>
            <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
              <div className="text-3xl font-bold text-secondary-900 dark:text-white mb-1">
                {stats?.total_resumes ?? 0}
              </div>
              <div className="text-sm text-secondary-600 dark:text-secondary-400">Resumes Analyzed</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}