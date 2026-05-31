import React, { useState } from 'react';
import { FolderGit2, Code, AlertTriangle, Award, Layers, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { analyzeProject } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export function ProjectAnalyzerPage() {
  const { user } = useAuth();
  const [repoUrl, setRepoUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    quality_score: number;
    repo_name: string;
    summary: string;
    technologies: string[];
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    // Extract repo name from URL
    const urlParts = repoUrl.replace(/\/$/, '').split('/');
    const repoName = urlParts.slice(-2).join('/');

    if (!repoName || !repoName.includes('/')) {
      setError('Invalid GitHub repository URL format');
      return;
    }

    setAnalyzing(true);
    setError('');
    setResult(null);

    try {
      const response = await analyzeProject(repoUrl, repoName);

      if (response.error) {
        throw new Error(response.error);
      }

      setResult(response.data);

      if (user) {
        await supabase.from('project_analyses').insert({
          user_id: user.id,
          repo_url: repoUrl,
          repo_name: repoName,
          technologies: response.data.technologies || [],
          summary: response.data.summary || '',
          strengths: response.data.strengths || [],
          weaknesses: response.data.weaknesses || [],
          recommendations: response.data.recommendations || [],
          quality_score: response.data.quality_score || 0,
        });

        await supabase.from('user_activities').insert({
          user_id: user.id,
          activity_type: 'project_analysis',
          title: `Analyzed project: ${repoName}`,
          metadata: { quality_score: response.data.quality_score },
        });
      }

      setSuccess('Project analyzed!');
    } catch (err: any) {
      setError(err.message || 'Failed to analyze project');
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
          Project Analyzer
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Analyze your GitHub repositories for quality and best practices
        </p>
      </div>

      {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderGit2 className="w-5 h-5" />
              Analyze Repository
            </CardTitle>
            <CardDescription>Enter a public GitHub repository URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Repository URL"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              leftIcon={<FolderGit2 className="w-5 h-5" />}
            />

            <Button
              onClick={handleAnalyze}
              isLoading={analyzing}
              disabled={!repoUrl.trim()}
              className="w-full"
            >
              Analyze Project
            </Button>

            {repoUrl && (
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                View Repository
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
                {/* Score and Summary */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="text-center p-6 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-xl">
                    <div className="text-4xl font-bold gradient-text">{result.quality_score}%</div>
                    <div className="text-sm text-secondary-600 dark:text-secondary-400">
                      Quality Score
                    </div>
                  </div>
                  <div className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                    <h4 className="font-medium text-secondary-900 dark:text-white mb-2">
                      {result.repo_name}
                    </h4>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      {result.summary}
                    </p>
                  </div>
                </div>

                {/* Technologies */}
                {result.technologies?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-3 flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Technologies Used
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {result.technologies.map((tech, i) => (
                        <Badge key={i} variant="primary">{tech}</Badge>
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
                <FolderGit2 className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
                <p className="text-secondary-600 dark:text-secondary-400">
                  Enter a GitHub repository URL to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
