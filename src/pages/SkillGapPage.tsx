import React, { useState } from 'react';
import { TrendingUp, Target, ArrowRight, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { analyzeSkillGap } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

/** Safely coerce any AI value to a string array — handles string, array, object, null */
function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(item => {
      // Handle nested objects
      if (typeof item === 'object' && item !== null) {
        // Try to extract title, name, description, or convert to string
        const obj = item as Record<string, unknown>;
        if (obj.title) return String(obj.title);
        if (obj.name) return String(obj.name);
        if (obj.description) return String(obj.description);
        if (obj.recommendation) return String(obj.recommendation);
        // If no common fields, stringify but remove brackets
        const str = JSON.stringify(item);
        return str.replace(/[{}]/g, '').replace(/"/g, '');
      }
      return String(item);
    }).filter(Boolean);
  }
  if (typeof value === 'string') {
    // Check if it's a JSON string
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return toStringArray(parsed);
      }
      if (typeof parsed === 'object' && parsed !== null) {
        return toStringArray([parsed]);
      }
      return [String(parsed)];
    } catch {
      // Not JSON, split by commas if needed
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  if (typeof value === 'object' && value !== null) {
    // Handle single object
    return toStringArray([value]);
  }
  return [];
}

/** Deep extract recommendations from potentially nested AI responses */
function extractRecommendations(value: unknown): string[] {
  if (!value) return [];
  
  // If it's an array
  if (Array.isArray(value)) {
    const results: string[] = [];
    for (const item of value) {
      results.push(...extractRecommendations(item));
    }
    return results;
  }
  
  // If it's an object
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    
    // Try common field names
    if (obj.recommendation) return extractRecommendations(obj.recommendation);
    if (obj.recommendations) return extractRecommendations(obj.recommendations);
    if (obj.advice) return extractRecommendations(obj.advice);
    if (obj.suggestion) return extractRecommendations(obj.suggestion);
    if (obj.tip) return extractRecommendations(obj.tip);
    if (obj.description) return [String(obj.description)];
    if (obj.text) return [String(obj.text)];
    if (obj.message) return [String(obj.message)];
    if (obj.title) return [String(obj.title)];
    
    // If it has a 'steps' array
    if (Array.isArray(obj.steps)) {
      return extractRecommendations(obj.steps);
    }
    
    // If it has an 'items' array
    if (Array.isArray(obj.items)) {
      return extractRecommendations(obj.items);
    }
    
    // If none of the above, try to extract all string values
    const stringValues = Object.values(obj)
      .filter(v => typeof v === 'string' && v.length > 0)
      .map(v => String(v));
    
    if (stringValues.length > 0) {
      return stringValues;
    }
    
    // Last resort: convert to string without brackets
    const str = JSON.stringify(obj);
    if (str !== '{}' && str !== '[]') {
      return [str.replace(/[{}[\]]/g, '').replace(/"/g, '').trim()];
    }
  }
  
  // If it's a string
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  
  return [];
}

interface SkillGapResult {
  missing_skills: string[];
  priority_skills: string[];
  recommendations: string[];
}

function SkillGapContent() {
  const { user } = useAuth();
  const [currentSkills, setCurrentSkills] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SkillGapResult | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAnalyze = async () => {
    if (!currentSkills.trim() || !targetRole.trim()) {
      setError('Please enter your current skills and target role');
      return;
    }

    setAnalyzing(true);
    setError('');
    setSuccess('');
    setResult(null);

    const skillsArray = currentSkills.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const response = await analyzeSkillGap(skillsArray, targetRole);

      if (response.error) throw new Error(response.error);

      // Extract and coerce all fields properly
      const data: SkillGapResult = {
        missing_skills: toStringArray(response.data?.missing_skills),
        priority_skills: toStringArray(response.data?.priority_skills),
        recommendations: extractRecommendations(response.data?.recommendations),
      };

      // Additional safety: flatten any remaining nested arrays
      if (data.recommendations.some(rec => rec.includes(',') && !rec.startsWith('•'))) {
        data.recommendations = data.recommendations.flatMap(rec => 
          rec.includes(',') && !rec.startsWith('•') && rec.length < 100
            ? rec.split(',').map(r => r.trim())
            : [rec]
        );
      }

      if (
        data.missing_skills.length === 0 &&
        data.priority_skills.length === 0 &&
        data.recommendations.length === 0
      ) {
        throw new Error('The AI returned no results. Please try again in a moment.');
      }

      setResult(data);

      if (user) {
        await supabase.from('skill_gap_analyses').insert({
          user_id: user.id,
          current_skills: skillsArray,
          target_role: targetRole,
          missing_skills: data.missing_skills,
          priority_skills: data.priority_skills,
          recommendations: data.recommendations,
        });
        await supabase.from('user_activities').insert({
          user_id: user.id,
          activity_type: 'skill_gap',
          title: `Analyzed gap for ${targetRole}`,
        });
      }

      setSuccess('Analysis complete!');
    } catch (err: any) {
      setError(err.message || 'Failed to analyze skill gap. Please try again.');
      console.error('Skill gap error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const hasData = result && (
    result.missing_skills.length > 0 ||
    result.priority_skills.length > 0 ||
    result.recommendations.length > 0
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
          Skill Gap Analysis
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Identify missing skills and get a personalized improvement plan
        </p>
      </div>

      {error   && <Alert variant="error"   onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Analyze Your Skills
            </CardTitle>
            <CardDescription>Compare your skills with your target role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Target Role"
              placeholder="e.g., Senior Full Stack Developer"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
            />
            <div>
              <label className="label">Current Skills</label>
              <textarea
                className="input min-h-[120px]"
                placeholder="Enter your skills separated by commas&#10;e.g., JavaScript, React, Node.js, SQL"
                value={currentSkills}
                onChange={e => setCurrentSkills(e.target.value)}
              />
              <p className="text-xs text-secondary-500 mt-1">Separate skills with commas</p>
            </div>
            <Button
              onClick={handleAnalyze}
              isLoading={analyzing}
              disabled={analyzing || !currentSkills.trim() || !targetRole.trim()}
              className="w-full"
              leftIcon={<Target className="w-4 h-4" />}
            >
              {analyzing ? 'Analyzing…' : 'Analyze Skill Gap'}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Analysis Results
              {result && !analyzing && (
                <button
                  onClick={handleAnalyze}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Re-analyze
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyzing && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                <p className="text-sm text-secondary-500">
                  Analyzing skills for <strong>{targetRole}</strong>…
                </p>
              </div>
            )}

            {!analyzing && !result && (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
                <p className="text-secondary-500 dark:text-secondary-400">
                  Enter your skills and target role to see the analysis
                </p>
              </div>
            )}

            {!analyzing && result && !hasData && (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-warning-400 mx-auto mb-4" />
                <p className="text-secondary-500 dark:text-secondary-400 mb-4">
                  No gaps found — you may already have the required skills, or try a more specific role.
                </p>
                <Button variant="outline" size="sm" onClick={handleAnalyze}>Try Again</Button>
              </div>
            )}

            {!analyzing && hasData && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-error-50 dark:bg-error-900/20 rounded-xl">
                    <div className="text-2xl font-bold text-error-600 dark:text-error-400">
                      {result!.missing_skills.length}
                    </div>
                    <div className="text-xs text-secondary-500">Missing Skills</div>
                  </div>
                  <div className="p-4 bg-warning-50 dark:bg-warning-900/20 rounded-xl">
                    <div className="text-2xl font-bold text-warning-600 dark:text-warning-400">
                      {result!.priority_skills.length}
                    </div>
                    <div className="text-xs text-secondary-500">Priority Skills</div>
                  </div>
                  <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-xl">
                    <div className="text-2xl font-bold text-success-600 dark:text-success-400">
                      {currentSkills.split(',').filter(s => s.trim()).length}
                    </div>
                    <div className="text-xs text-secondary-500">Current Skills</div>
                  </div>
                </div>

                {result!.missing_skills.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning-500" />
                      Missing Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {result!.missing_skills.map((skill, i) => (
                        <Badge key={i} variant="error">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {result!.priority_skills.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-3">
                      Priority Skills to Learn
                    </h4>
                    <ul className="space-y-2">
                      {result!.priority_skills.map((skill, i) => (
                        <li key={i} className="flex items-center gap-2 p-2 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                          <ArrowRight className="w-4 h-4 text-primary-500 flex-shrink-0" />
                          <span className="text-secondary-700 dark:text-secondary-300">{skill}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result!.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-secondary-900 dark:text-white mb-3">
                      Recommendations
                    </h4>
                    <div className="space-y-3">
                      {result!.recommendations.map((rec, i) => (
                        <div key={i} className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                            <p className="text-sm text-secondary-600 dark:text-secondary-300 leading-relaxed">
                              {rec}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SkillGapPage() {
  return (
    <ErrorBoundary>
      <SkillGapContent />
    </ErrorBoundary>
  );
}