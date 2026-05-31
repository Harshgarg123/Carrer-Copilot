import React, { useState, useEffect } from 'react';
import { Target, Zap, Check, X, AlertTriangle, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { analyzeJobMatch } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { Input } from '../components/ui/Input';
import { Progress } from '../components/ui/Progress';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';

interface Resume {
  id: string;
  file_name: string;
}

interface MatchResult {
  match_percentage: number;
  matched_skills: string[];
  missing_skills: string[];
  suggestions: string[];
}

export function JobMatchPage() {
  const { user } = useAuth();
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function fetchResumes() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('resumes')
          .select('id, file_name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setResumes(data || []);
        if (data && data.length > 0) {
          setSelectedResumeId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchResumes();
  }, [user]);

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setAnalyzing(true);
    setError('');
    setResult(null);

    try {
      const response = await analyzeJobMatch(
        jobDescription,
        undefined,
        jobTitle,
        company
      );

      if (response.error) {
        throw new Error(response.error);
      }

      setResult(response.data);

      // Save to database
      if (user) {
        await supabase.from('job_matches').insert({
          user_id: user.id,
          resume_id: selectedResumeId || null,
          job_description: jobDescription,
          job_title: jobTitle,
          company: company,
          match_percentage: response.data.match_percentage,
          matched_skills: response.data.matched_skills,
          missing_skills: response.data.missing_skills,
          suggestions: response.data.suggestions,
        });

        await supabase.from('user_activities').insert({
          user_id: user.id,
          activity_type: 'job_match',
          title: `Analyzed match for ${jobTitle || 'position'}${company ? ` at ${company}` : ''}`,
          metadata: { match_percentage: response.data.match_percentage },
        });
      }

      setSuccess('Analysis complete!');
    } catch (err: any) {
      setError(err.message || 'Failed to analyze job match');
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
          Job Match Analyzer
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Compare your profile against job descriptions to identify gaps
        </p>
      </div>

      {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Job Details
            </CardTitle>
            <CardDescription>Enter the job posting details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Job Title"
              placeholder="e.g., Senior Software Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />

            <Input
              label="Company"
              placeholder="e.g., Google"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />

            <Textarea
              label="Job Description"
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[200px]"
            />

            {resumes.length > 0 && (
              <div>
                <label className="label">Compare with Resume (Optional)</label>
                <select
                  className="input"
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                >
                  <option value="">No resume selected</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>{r.file_name}</option>
                  ))}
                </select>
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              isLoading={analyzing}
              disabled={!jobDescription.trim()}
              className="w-full"
              leftIcon={<Target className="w-4 h-4" />}
            >
              Analyze Match
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Match Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-6">
                {/* Match Score */}
                <div className="text-center p-6 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-xl">
                  <div className="text-5xl font-bold gradient-text mb-2">
                    {result.match_percentage}%
                  </div>
                  <div className="text-secondary-600 dark:text-secondary-400">
                    Match Score
                  </div>
                </div>

                <Progress
                  value={result.match_percentage}
                  size="lg"
                  showLabel
                />

                {/* Matched Skills */}
                <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="w-5 h-5 text-success-600 dark:text-success-400" />
                    <span className="font-medium text-success-700 dark:text-success-300">
                      Matched Skills ({result.matched_skills.length})
                    </span>
                  </div>
                  {result.matched_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {result.matched_skills.map((skill, i) => (
                        <Badge key={i} variant="success">{skill}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-secondary-500">No matched skills detected</p>
                  )}
                </div>

                {/* Missing Skills */}
                <div className="p-4 bg-error-50 dark:bg-error-900/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <X className="w-5 h-5 text-error-600 dark:text-error-400" />
                    <span className="font-medium text-error-700 dark:text-error-300">
                      Missing Skills ({result.missing_skills.length})
                    </span>
                  </div>
                  {result.missing_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {result.missing_skills.map((skill, i) => (
                        <Badge key={i} variant="error">{skill}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-secondary-500">No missing skills detected</p>
                  )}
                </div>

                {/* Suggestions */}
                {result.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning-500" />
                      Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {result.suggestions.map((suggestion, i) => (
                        <li key={i} className="p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg text-secondary-700 dark:text-secondary-300 text-sm">
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
                <p className="text-secondary-600 dark:text-secondary-400">
                  Paste a job description and click analyze to see your match score
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
