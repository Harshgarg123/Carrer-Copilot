import React, { useState } from 'react';
import { Github, Star, Code, AlertTriangle, Award, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { analyzeGithubProfile } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export function GitHubPage() {
  const { user } = useAuth();
  const [githubUrl, setGithubUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    username: string;
    profile_data: {
      public_repos: number;
      followers: number;
      bio?: string;
    };
    top_languages: string[];
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAnalyze = async () => {
    if (!githubUrl.trim()) {
      setError('Please enter a GitHub profile URL');
      return;
    }

    // Extract username from URL
    const urlParts = githubUrl.replace(/\/$/, '').split('/');
    const username = urlParts.pop() || urlParts[urlParts.length - 1];

    if (!username) {
      setError('Invalid GitHub URL format');
      return;
    }

    setAnalyzing(true);
    setError('');
    setResult(null);

    try {
      const response = await analyzeGithubProfile(githubUrl, username);

      if (response.error) {
        throw new Error(response.error);
      }

      setResult(response.data);

      if (user) {
        await supabase.from('github_analyses').insert({
          user_id: user.id,
          github_url: githubUrl,
          username: username,
          profile_data: response.data.profile_data || {},
          strengths: response.data.strengths || [],
          weaknesses: response.data.weaknesses || [],
          recommendations: response.data.recommendations || [],
          score: response.data.score || 0,
        });

        await supabase.from('user_activities').insert({
          user_id: user.id,
          activity_type: 'github_analysis',
          title: `Analyzed GitHub profile: ${username}`,
          metadata: { score: response.data.score },
        });
      }

      setSuccess('Profile analyzed!');
    } catch (err: any) {
      setError(err.message || 'Failed to analyze GitHub profile');
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
          GitHub Profile Analyzer
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Get insights on your GitHub profile and portfolio
        </p>
      </div>

      {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="w-5 h-5" />
              Analyze Profile
            </CardTitle>
            <CardDescription>Enter your GitHub profile URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="GitHub Profile URL"
              placeholder="https://github.com/username"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              leftIcon={<Github className="w-5 h-5" />}
            />

            <Button
              onClick={handleAnalyze}
              isLoading={analyzing}
              disabled={!githubUrl.trim()}
              className="w-full"
            >
              Analyze Profile
            </Button>

            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                View Profile
              </a>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {result.score}%
                    </div>
                    <div className="text-xs text-secondary-500">Overall Score</div>
                  </div>
                  <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                    <div className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
                      {result.profile_data?.public_repos || 0}
                    </div>
                    <div className="text-xs text-secondary-500">Repositories</div>
                  </div>
                  <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                    <div className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
                      {result.profile_data?.followers || 0}
                    </div>
                    <div className="text-xs text-secondary-500">Followers</div>
                  </div>
                  <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                    <div className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
                      {result.top_languages?.length || 0}
                    </div>
                    <div className="text-xs text-secondary-500">Languages</div>
                  </div>
                </div>

                {/* Top Languages */}
                {result.top_languages?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-3 flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Top Languages
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {result.top_languages.map((lang, i) => (
                        <Badge key={i} variant="primary">{lang}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths */}
                {result.strengths?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-3">
                      <Award className="w-4 h-4 inline mr-2 text-success-500" />
                      Strengths
                    </h4>
                    <ul className="space-y-2">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="p-2 bg-success-50 dark:bg-success-900/20 rounded text-success-700 dark:text-success-300 text-sm">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses */}
                {result.weaknesses?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-3">
                      <AlertTriangle className="w-4 h-4 inline mr-2 text-warning-500" />
                      Areas to Improve
                    </h4>
                    <ul className="space-y-2">
                      {result.weaknesses.map((w, i) => (
                        <li key={i} className="p-2 bg-warning-50 dark:bg-warning-900/20 rounded text-warning-700 dark:text-warning-300 text-sm">
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-3">
                      Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {result.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-secondary-600 dark:text-secondary-400 text-sm">
                          <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-medium text-primary-600 dark:text-primary-400 flex-shrink-0">
                            {i + 1}
                          </div>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Github className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
                <p className="text-secondary-600 dark:text-secondary-400">
                  Enter your GitHub profile URL to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
