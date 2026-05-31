import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, Award, ChevronRight, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateInterviewQuestions, evaluateInterviewAnswer } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { Alert } from '../components/ui/Alert';

interface Question {
  id: string;
  question: string;
  category: string;
  difficulty: string;
}

interface Evaluation {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

const DEFAULT_ROLES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Engineer',
  'Machine Learning Engineer',
  'Product Manager',
];

const CUSTOM_ROLES_KEY = 'interview_custom_roles';

export function MockInterviewPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<'setup' | 'interview' | 'results'>('setup');
  const [role, setRole] = useState('Software Engineer');
  const [experienceLevel, setExperienceLevel] = useState('mid');
  const [difficulty, setDifficulty] = useState('medium');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [interviewId, setInterviewId] = useState<string>('');
  const [error, setError] = useState('');

  // Custom role state
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [addRoleError, setAddRoleError] = useState('');

  // Load custom roles from Supabase (falls back to localStorage)
  useEffect(() => {
    async function loadCustomRoles() {
      if (user) {
        const { data } = await supabase
          .from('user_custom_roles')
          .select('role_name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (data && data.length > 0) {
          setCustomRoles(data.map(r => r.role_name));
          return;
        }
      }
      // Fallback: localStorage
      try {
        const stored = localStorage.getItem(CUSTOM_ROLES_KEY);
        if (stored) setCustomRoles(JSON.parse(stored));
      } catch {}
    }
    loadCustomRoles();
  }, [user]);

  const allRoles = [...DEFAULT_ROLES, ...customRoles];

  const handleAddRole = async () => {
    const trimmed = newRoleName.trim();
    if (!trimmed) {
      setAddRoleError('Please enter a role name');
      return;
    }
    if (allRoles.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
      setAddRoleError('This role already exists');
      return;
    }

    const updated = [...customRoles, trimmed];
    setCustomRoles(updated);
    setRole(trimmed);
    setNewRoleName('');
    setShowAddRole(false);
    setAddRoleError('');

    // Persist
    if (user) {
      await supabase.from('user_custom_roles').insert({
        user_id: user.id,
        role_name: trimmed,
      });
    } else {
      localStorage.setItem(CUSTOM_ROLES_KEY, JSON.stringify(updated));
    }
  };

  const handleDeleteRole = async (roleToDelete: string) => {
    const updated = customRoles.filter(r => r !== roleToDelete);
    setCustomRoles(updated);
    if (role === roleToDelete) setRole(DEFAULT_ROLES[0]);

    if (user) {
      await supabase
        .from('user_custom_roles')
        .delete()
        .eq('user_id', user.id)
        .eq('role_name', roleToDelete);
    } else {
      localStorage.setItem(CUSTOM_ROLES_KEY, JSON.stringify(updated));
    }
  };

  const handleStart = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await generateInterviewQuestions(role, experienceLevel, difficulty);
      if (response.error) throw new Error(response.error);

      setQuestions(response.data.questions);
      setStep('interview');

      if (user) {
        const { data: interviewData } = await supabase
          .from('mock_interviews')
          .insert({ user_id: user.id, role, experience_level: experienceLevel, difficulty, status: 'in_progress' })
          .select('id')
          .single();

        if (interviewData) setInterviewId(interviewData.id);

        await supabase.from('user_activities').insert({
          user_id: user.id,
          activity_type: 'interview_start',
          title: `Started ${role} interview practice`,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start interview');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    const answer = answers[currentQuestion.id];

    if (!answer?.trim()) { setError('Please enter an answer'); return; }

    setSubmitting(true);
    setError('');

    try {
      const response = await evaluateInterviewAnswer(
        currentQuestion.id, currentQuestion.question, answer, interviewId
      );
      if (response.error) throw new Error(response.error);

      const evaluation: Evaluation = response.data;
      const updatedEvaluations = { ...evaluations, [currentQuestion.id]: evaluation };
      setEvaluations(updatedEvaluations);

      if (user && interviewId) {
        await supabase.from('interview_questions').insert({
          interview_id: interviewId,
          question: currentQuestion.question,
          category: currentQuestion.category,
          difficulty: currentQuestion.difficulty,
          user_answer: answer,
          score: evaluation.score,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          suggestions: evaluation.suggestions,
        });
      }

      const isLastQuestion = currentQuestionIndex >= questions.length - 1;
      if (isLastQuestion) {
        await finishInterview(updatedEvaluations, questions);
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate answer');
    } finally {
      setSubmitting(false);
    }
  };

  const finishInterview = async (
    allEvaluations: Record<string, Evaluation>,
    allQuestions: Question[]
  ) => {
    const scores = Object.values(allEvaluations).map(e => e.score);
    const totalScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0;

    if (user && interviewId) {
      await supabase.from('mock_interviews').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_score: totalScore,
      }).eq('id', interviewId);

      await supabase.from('user_activities').insert({
        user_id: user.id,
        activity_type: 'interview_complete',
        title: `Completed ${role} interview practice`,
        metadata: { score: totalScore, role },
      });

      const { data: existing } = await supabase
        .from('career_stats').select('total_interviews, interview_score')
        .eq('user_id', user.id).maybeSingle();

      if (existing) {
        const prevTotal = existing.total_interviews || 0;
        const prevScore = existing.interview_score || 0;
        const newTotal = prevTotal + 1;
        const newScore = Math.round((prevScore * prevTotal + totalScore) / newTotal);
        await supabase.from('career_stats').update({
          total_interviews: newTotal,
          interview_score: newScore,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id);
      }
    }
    setStep('results');
  };

  const resetInterview = () => {
    setStep('setup');
    setQuestions([]);
    setAnswers({});
    setEvaluations({});
    setCurrentQuestionIndex(0);
    setInterviewId('');
    setError('');
  };

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">Mock Interview</h1>
        <p className="text-secondary-600 dark:text-secondary-400">Practice with AI-generated interview questions</p>
      </div>

      {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}

      {/* ── SETUP ── */}
      {step === 'setup' && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Your Interview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Role selector */}
            <div>
              <label className="label">Target Role</label>
              <div className="flex gap-2">
                <select
                  className="input flex-1"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                >
                  {DEFAULT_ROLES.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  {customRoles.length > 0 && (
                    <optgroup label="Custom Roles">
                      {customRoles.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button
                  onClick={() => { setShowAddRole(v => !v); setAddRoleError(''); setNewRoleName(''); }}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                  title="Add custom role"
                >
                  <Plus className="w-4 h-4" />
                  Add Role
                </button>
              </div>

              {/* Add role inline form */}
              {showAddRole && (
                <div className="mt-3 p-4 border border-primary-200 dark:border-primary-800 rounded-xl bg-primary-50 dark:bg-primary-900/20 space-y-3">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">Add Custom Role</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input flex-1"
                      placeholder="e.g., Site Reliability Engineer"
                      value={newRoleName}
                      onChange={e => { setNewRoleName(e.target.value); setAddRoleError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleAddRole()}
                      autoFocus
                    />
                    <button
                      onClick={handleAddRole}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setShowAddRole(false); setAddRoleError(''); setNewRoleName(''); }}
                      className="px-3 py-2 bg-secondary-200 dark:bg-secondary-700 hover:bg-secondary-300 dark:hover:bg-secondary-600 rounded-lg text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {addRoleError && (
                    <p className="text-xs text-error-600 dark:text-error-400">{addRoleError}</p>
                  )}
                </div>
              )}

              {/* Custom roles chips */}
              {customRoles.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-secondary-500 mb-2">Your custom roles:</p>
                  <div className="flex flex-wrap gap-2">
                    {customRoles.map(r => (
                      <span
                        key={r}
                        className="flex items-center gap-1 px-3 py-1 bg-secondary-100 dark:bg-secondary-700 rounded-full text-sm text-secondary-700 dark:text-secondary-300"
                      >
                        {r}
                        <button
                          onClick={() => handleDeleteRole(r)}
                          className="ml-1 text-secondary-400 hover:text-error-500 transition-colors"
                          title={`Remove ${r}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Experience level */}
            <div>
              <label className="label">Experience Level</label>
              <select className="input" value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}>
                <option value="junior">Junior (0-2 years)</option>
                <option value="mid">Mid-level (2-5 years)</option>
                <option value="senior">Senior (5-8 years)</option>
                <option value="lead">Lead / Principal (8+ years)</option>
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="label">Difficulty</label>
              <select className="input" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <Button
              onClick={handleStart}
              isLoading={loading}
              className="w-full"
              leftIcon={<MessageSquare className="w-4 h-4" />}
            >
              Start Interview
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── INTERVIEW ── */}
      {step === 'interview' && currentQuestion && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Badge variant="primary">Question {currentQuestionIndex + 1} of {totalQuestions}</Badge>
            <div className="flex items-center gap-2 text-sm text-secondary-600 dark:text-secondary-400">
              <Clock className="w-4 h-4" />
              {currentQuestion.category}
            </div>
          </div>

          <Progress value={(currentQuestionIndex / totalQuestions) * 100} />

          <Card>
            <CardContent className="pt-6 space-y-4">
              <Badge variant={
                currentQuestion.difficulty === 'easy' ? 'success' :
                currentQuestion.difficulty === 'medium' ? 'warning' : 'error'
              }>
                {currentQuestion.difficulty}
              </Badge>

              <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">
                {currentQuestion.question}
              </h2>

              <Textarea
                placeholder="Type your answer here…"
                value={answers[currentQuestion.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                className="min-h-[150px]"
              />

              <Button
                onClick={handleSubmitAnswer}
                isLoading={submitting}
                disabled={!answers[currentQuestion.id]?.trim()}
                className="w-full"
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                {currentQuestionIndex < totalQuestions - 1 ? 'Next Question' : 'Finish Interview'}
              </Button>
            </CardContent>
          </Card>

          {evaluations[currentQuestion.id] && (
            <Card>
              <CardHeader><CardTitle>Feedback</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                    {evaluations[currentQuestion.id].score}/100
                  </div>
                  <Progress value={evaluations[currentQuestion.id].score} className="flex-1" />
                </div>

                {evaluations[currentQuestion.id].strengths.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-success-600 dark:text-success-400 mb-2">Strengths</p>
                    <ul className="space-y-1">
                      {evaluations[currentQuestion.id].strengths.map((s, i) => (
                        <li key={i} className="text-sm text-secondary-600 dark:text-secondary-400">+ {s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluations[currentQuestion.id].suggestions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-2">Suggestions</p>
                    <ul className="space-y-1">
                      {evaluations[currentQuestion.id].suggestions.map((s, i) => (
                        <li key={i} className="text-sm text-secondary-600 dark:text-secondary-400">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── RESULTS ── */}
      {step === 'results' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <Award className="w-16 h-16 text-warning-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">Interview Complete!</h2>
              <div className="text-5xl font-bold gradient-text mb-2">
                {Math.round(
                  Object.values(evaluations).reduce((sum, e) => sum + e.score, 0) /
                  Math.max(Object.values(evaluations).length, 1)
                )}%
              </div>
              <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                Average Score Across {questions.length} Questions
              </p>
              <Button onClick={resetInterview}>Start New Interview</Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <Card key={q.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Badge variant="secondary" className="mb-2">Q{i + 1}</Badge>
                      <p className="text-secondary-900 dark:text-white font-medium">{q.question}</p>
                      {answers[q.id] && (
                        <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-2">
                          Your answer: {answers[q.id].substring(0, 100)}…
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        {evaluations[q.id]?.score || 0}
                      </div>
                      <div className="text-xs text-secondary-500">/100</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}