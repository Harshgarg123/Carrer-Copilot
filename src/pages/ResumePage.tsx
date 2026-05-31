import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, Trash2, RefreshCw, Award, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { analyzeResume } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/Progress';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Spinner';

interface Resume {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  score: number;
  ats_score: number;
  created_at: string;
}

interface ResumeAnalysis {
  overall_score: number;
  ats_score: number;
  strengths: string[];
  weaknesses: string[];
  missing_keywords: string[];
  suggestions: string[];
}

export function ResumePage() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fetchResumes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setResumes(data || []);
      if (data && data.length > 0) {
        setSelectedResume(data[0]);
      }
    } catch (err) {
      setError('Failed to load resumes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleFileUpload = async (file: File) => {
    if (!user) return;

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF or DOCX file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      const { data: resumeData, error: insertError } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: publicUrl,
          extracted_data: {},
          score: 0,
          ats_score: 0,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setResumes([resumeData, ...resumes]);
      setSelectedResume(resumeData);
      setSuccess('Resume uploaded successfully!');

      await supabase.from('user_activities').insert({
        user_id: user.id,
        activity_type: 'resume_upload',
        title: `Uploaded resume: ${file.name}`,
      });
    } catch (err) {
      setError('Failed to upload resume. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, []);

  const handleAnalyze = async () => {
    if (!selectedResume) return;

    setAnalyzing(true);
    setError('');
    setAnalysis(null);

    try {
      const result = await analyzeResume(selectedResume.id);

      if (result.error) {
        throw new Error(result.error);
      }

      const analysisData = result.data;
      setAnalysis(analysisData);

      // Update resume scores
      await supabase
        .from('resumes')
        .update({
          score: analysisData.overall_score,
          ats_score: analysisData.ats_score,
        })
        .eq('id', selectedResume.id);

      // Update local state
      setResumes(prev => prev.map(r =>
        r.id === selectedResume.id
          ? { ...r, score: analysisData.overall_score, ats_score: analysisData.ats_score }
          : r
      ));

      await supabase.from('user_activities').insert({
        user_id: user!.id,
        activity_type: 'resume_analysis',
        title: `Analyzed resume: ${selectedResume.file_name}`,
        metadata: { score: analysisData.overall_score },
      });

      setSuccess('Resume analyzed successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to analyze resume');
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const deleteResume = async (resumeId: string) => {
    try {
      await supabase.from('resumes').delete().eq('id', resumeId);
      const updatedResumes = resumes.filter(r => r.id !== resumeId);
      setResumes(updatedResumes);

      if (selectedResume?.id === resumeId) {
        setSelectedResume(updatedResumes[0] || null);
        setAnalysis(null);
      }
      setSuccess('Resume deleted');
    } catch (err) {
      setError('Failed to delete resume');
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
          Resume Analysis
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Upload your resume and get AI-powered insights
        </p>
      </div>

      {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Upload Section */}
      <Card>
        <CardContent className="pt-6">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-secondary-300 dark:border-secondary-600 hover:border-primary-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              disabled={uploading}
            />
            <Upload className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-secondary-900 dark:text-white mb-2">
              Drop your resume here or click to browse
            </p>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Supports PDF, DOCX up to 10MB
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Resume List */}
      {loading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : resumes.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          {resumes.map((resume) => (
            <Card
              key={resume.id}
              variant="hover"
              className={`cursor-pointer ${
                selectedResume?.id === resume.id ? 'ring-2 ring-primary-500' : ''
              }`}
              onClick={() => {
                setSelectedResume(resume);
                setAnalysis(null);
              }}
            >
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <FileText className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this resume?')) {
                        deleteResume(resume.id);
                      }
                    }}
                    className="p-1 text-secondary-400 hover:text-error-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-medium text-secondary-900 dark:text-white truncate">
                  {resume.file_name}
                </h3>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                  Uploaded {new Date(resume.created_at).toLocaleDateString()}
                </p>
                {resume.score > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-secondary-600 dark:text-secondary-400 mb-1">
                      <span>Score</span>
                      <span>{resume.score}%</span>
                    </div>
                    <Progress value={resume.score} size="sm" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Analysis Section */}
      {selectedResume && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Resume Analysis</CardTitle>
              <CardDescription>
                AI-powered insights for {selectedResume.file_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysis ? (
                <div className="space-y-6">
                  {/* Scores */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                      <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                        {analysis.overall_score}%
                      </div>
                      <div className="text-sm text-secondary-600 dark:text-secondary-400">Overall Score</div>
                    </div>
                    <div className="text-center p-4 bg-accent-50 dark:bg-accent-900/20 rounded-xl">
                      <div className="text-3xl font-bold text-accent-600 dark:text-accent-400 mb-1">
                        {analysis.ats_score}%
                      </div>
                      <div className="text-sm text-secondary-600 dark:text-secondary-400">ATS Score</div>
                    </div>
                    <div className="text-center p-4 bg-success-50 dark:bg-success-900/20 rounded-xl">
                      <div className="text-3xl font-bold text-success-600 dark:text-success-400 mb-1">
                        {Math.round((analysis.overall_score + analysis.ats_score) / 2)}%
                      </div>
                      <div className="text-sm text-secondary-600 dark:text-secondary-400">Average</div>
                    </div>
                  </div>

                  {/* Strengths */}
                  <div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-3 flex items-center gap-2">
                      <Award className="w-5 h-5 text-success-500" />
                      Strengths
                    </h4>
                    <ul className="space-y-2">
                      {analysis.strengths.map((strength, i) => (
                        <li key={i} className="flex items-start gap-2 p-2 bg-success-50 dark:bg-success-900/20 rounded-lg">
                          <div className="w-1.5 h-1.5 rounded-full bg-success-500 mt-2" />
                          <span className="text-secondary-700 dark:text-secondary-300">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Weaknesses */}
                  <div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-warning-500" />
                      Areas to Improve
                    </h4>
                    <ul className="space-y-2">
                      {analysis.weaknesses.map((weakness, i) => (
                        <li key={i} className="flex items-start gap-2 p-2 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
                          <div className="w-1.5 h-1.5 rounded-full bg-warning-500 mt-2" />
                          <span className="text-secondary-700 dark:text-secondary-300">{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Missing Keywords */}
                  {analysis.missing_keywords.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-secondary-900 dark:text-white mb-3">
                        Missing Keywords
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.missing_keywords.map((keyword, i) => (
                          <Badge key={i} variant="warning">{keyword}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  <div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-3">Recommendations</h4>
                    <ul className="space-y-2">
                      {analysis.suggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start gap-3 p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                          <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-medium text-primary-600 dark:text-primary-400 flex-shrink-0">
                            {i + 1}
                          </div>
                          <span className="text-secondary-700 dark:text-secondary-300">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <RefreshCw className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
                  <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                    Click below to analyze your resume with AI
                  </p>
                  <Button onClick={handleAnalyze} isLoading={analyzing}>
                    {analyzing ? 'Analyzing...' : 'Analyze Resume'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleAnalyze}
                  isLoading={analyzing}
                  className="w-full"
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  {analysis ? 'Re-analyze' : 'Analyze'}
                </Button>
                <a
                  href={selectedResume.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" className="w-full">
                    View Resume
                  </Button>
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <h4 className="font-medium text-secondary-900 dark:text-white mb-3">Tips</h4>
                <ul className="space-y-2 text-sm text-secondary-600 dark:text-secondary-400">
                  <li>Use action verbs to describe achievements</li>
                  <li>Include quantifiable results</li>
                  <li>Tailor keywords to the job</li>
                  <li>Keep formatting simple for ATS</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && resumes.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">
            No resumes uploaded yet
          </h3>
          <p className="text-secondary-600 dark:text-secondary-400">
            Upload your first resume to get started with AI analysis
          </p>
        </div>
      )}
    </div>
  );
}
