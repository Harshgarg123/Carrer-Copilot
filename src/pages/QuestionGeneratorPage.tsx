import React, { useState } from 'react';
import { HelpCircle, RefreshCw, Filter, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateQuestions } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

interface Question {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  hint?: string;
}

export function QuestionGeneratorPage() {
  const { user } = useAuth();
  const [source, setSource] = useState('role');
  const [targetRole, setTargetRole] = useState('');
  const [skill, setSkill] = useState('');
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState({ difficulty: 'all', category: 'all' });

  const sourceOptions = [
    { value: 'role', label: 'Target Role' },
    { value: 'skills', label: 'Specific Skills' },
    { value: 'general', label: 'General Questions' },
  ];

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setQuestions([]);

    try {
      const response = await generateQuestions(
        source,
        source === 'role' ? targetRole : undefined,
        source === 'skills' ? skill : undefined
      );

      if (response.error) {
        throw new Error(response.error);
      }

      setQuestions(response.data.questions || []);

      if (user) {
        await supabase.from('generated_questions').insert({
          user_id: user.id,
          source,
          category: source === 'role' ? targetRole : source === 'skills' ? skill : 'general',
          questions: response.data.questions || [],
        });

        await supabase.from('user_activities').insert({
          user_id: user.id,
          activity_type: 'question_generation',
          title: `Generated ${source === 'role' ? targetRole : source === 'skills' ? skill : 'general'} questions`,
        });
      }

      setSuccess(`Generated ${response.data.questions?.length || 0} questions!`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate questions');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const copyQuestion = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Failed to copy');
    }
  };

  const categories = [...new Set(questions.map(q => q.category))];

  const filteredQuestions = questions.filter(q => {
    if (filter.difficulty !== 'all' && q.difficulty !== filter.difficulty) return false;
    if (filter.category !== 'all' && q.category !== filter.category) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6 overflow-x-hidden">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
          Interview Question Generator
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Generate targeted interview questions for practice
        </p>
      </div>

      {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className='overflow-hidden'>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Configure Questions
            </CardTitle>
            <CardDescription>Choose how to generate questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="label">Question Source</label>
              <select
                className="input"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setQuestions([]);
                }}
              >
                {sourceOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {source === 'role' && (
              <Input
                label="Target Role"
                placeholder="e.g., Senior Software Engineer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            )}

            {source === 'skills' && (
              <Input
                label="Specific Skill"
                placeholder="e.g., React, System Design"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
              />
            )}

            <Button
              onClick={handleGenerate}
              isLoading={generating}
              disabled={source === 'role' && !targetRole.trim() || source === 'skills' && !skill.trim()}
              className="w-full"
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Generate Questions
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Generated Questions ({filteredQuestions.length})</CardTitle>
              {questions.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                  <Filter className="w-4 h-4 text-secondary-400" />
                  <select
                    className="w-full sm:w-auto text-sm bg-transparent border border-secondary-300 dark:border-secondary-600 rounded px-2 py-1 text-secondary-600 dark:text-secondary-400 focus:outline-none"
                    value={filter.difficulty}
                    onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
                  >
                    <option value="all">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  {categories.length > 0 && (
                    <select
                      className="w-full sm:w-auto text-sm bg-transparent border border-secondary-300 dark:border-secondary-600 rounded px-2 py-1 text-secondary-600 dark:text-secondary-400 focus:outline-none"
                      value={filter.category}
                      onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredQuestions.length > 0 ? (
              <div className="space-y-3 break-words overflow-hidden">
                {filteredQuestions.map((q, i) => (
                  <div
                    key={q.id}
                    className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge
                            variant={
                              q.difficulty === 'easy' ? 'success' :
                              q.difficulty === 'medium' ? 'warning' : 'error'
                            }
                          >
                            {q.difficulty}
                          </Badge>
                          {q.category && (
  <Badge
    variant="secondary"
    className="max-w-full break-words whitespace-normal text-center"
  >
    {q.category}
  </Badge>
)}
                        </div>
                        <p className="text-secondary-900 dark:text-white break-words whitespace-pre-wrap overflow-hidden">
                          {q.question}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => copyQuestion(q.id, q.question)}
                          className="p-2 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                          title="Copy"
                        >
                          {copiedId === q.id ? (
                            <Check className="w-4 h-4 text-success-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-secondary-400" />
                          )}
                        </button>
                        {q.hint && (
                          <button
                            onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                            className="p-2 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                            title="Show hint"
                          >
                            {expandedId === q.id ? (
                              <ChevronUp className="w-4 h-4 text-secondary-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-secondary-400" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {expandedId === q.id && q.hint && (
                      <div className="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700">
                        <p className="text-sm text-secondary-500 dark:text-secondary-400 break-words whitespace-pre-wrap">
                          <strong>Hint:</strong> {q.hint}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : questions.length > 0 ? (
              <div className="text-center py-8 text-secondary-500">
                No questions match your filters
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <HelpCircle className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
                <p className="text-secondary-600 dark:text-secondary-400">
                  Configure and generate questions to practice
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
