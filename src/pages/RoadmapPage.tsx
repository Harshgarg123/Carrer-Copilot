import React, { useState } from 'react';
import { Map, Calendar, BookOpen, Target, CheckCircle, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateRoadmap } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

/** Safely coerce any AI value to a string array */
function toStringArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === 'string') {
        return [item];
      }

      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, any>;

        if (obj.title && obj.url) {
          return [`${obj.title}|${obj.url}`];
        }

        if (obj.name) {
          return [String(obj.name)];
        }

        if (obj.title) {
          return [String(obj.title)];
        }

        return Object.values(obj)
          .filter((v) => typeof v === 'string')
          .map(String);
      }

      return [String(item)];
    });
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, any>).flatMap((v) => {
      if (typeof v === 'string') {
        return [v];
      }

      if (typeof v === 'object' && v !== null) {
        const obj = v as Record<string, any>;

        if (obj.title && obj.url) {
          return [`${obj.title}|${obj.url}`];
        }

        if (obj.name) {
          return [String(obj.name)];
        }

        if (obj.title) {
          return [String(obj.title)];
        }
      }

      return [];
    });
  }

  return [];
}

interface Milestone {
  week: number;
  title: string;
  objectives: string[];
  resources: string[];
}

interface Roadmap {
  milestones: Milestone[];
  estimated_duration: string;
}

function RoadmapContent() {
  const { user } = useAuth();
  const [currentSkills, setCurrentSkills] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [duration, setDuration] = useState('3 months');
  const [generating, setGenerating] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const durationOptions = [
    { value: '1 month',   label: '1 Month (Intensive)' },
    { value: '3 months',  label: '3 Months (Standard)' },
    { value: '6 months',  label: '6 Months (Comprehensive)' },
    { value: '12 months', label: '12 Months (Deep Dive)' },
  ];

  const handleGenerate = async () => {
    if (!currentSkills.trim() || !targetRole.trim()) {
      setError('Please enter your current skills and target role');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccess('');
    setRoadmap(null);

    const skillsArray = currentSkills.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const response = await generateRoadmap(skillsArray, targetRole, duration);

      if (response.error) throw new Error(response.error);

      const raw = response.data ?? {};

      // Normalise milestones — AI can put them under many key names and as objects not arrays
      let rawMilestones: unknown[] = [];
      const candidates = [raw.milestones, raw.roadmap, raw.steps, raw.phases, raw.plan];
      for (const c of candidates) {
        if (Array.isArray(c) && c.length > 0) { rawMilestones = c; break; }
        // AI sometimes returns object like {"1":{...},"2":{...}}
        if (c && typeof c === 'object' && !Array.isArray(c)) {
          rawMilestones = Object.values(c);
          if (rawMilestones.length > 0) break;
        }
      }

      if (rawMilestones.length === 0) {
        throw new Error('The AI returned an empty roadmap. Please try again.');
      }

      // Sanitise each milestone so .map() never throws even with weird shapes
      const milestones: Milestone[] = rawMilestones.map((m: any, i) => ({
        week:       typeof m?.week === 'number' ? m.week : i + 1,
        title:      String(m?.title ?? m?.phase ?? m?.name ?? `Phase ${i + 1}`),
        objectives: toStringArray(m?.objectives ?? m?.tasks ?? m?.goals ?? m?.learning_objectives),
        resources:  toStringArray(m?.resources ?? m?.tools ?? m?.materials),
      }));

      const data: Roadmap = {
        milestones,
        estimated_duration: String(
          raw?.estimated_duration ?? raw?.duration ?? raw?.total_duration ?? duration
        ),
      };

      setRoadmap(data);

      if (user) {
        await supabase.from('learning_roadmaps').insert({
          user_id: user.id,
          target_role: targetRole,
          milestones: data.milestones,
          estimated_duration: data.estimated_duration,
          progress: 0,
        });
        await supabase.from('user_activities').insert({
  user_id: user.id,
  activity_type: 'learning_roadmap',
  title: `Generated roadmap for ${targetRole}`,
});
      }

      setSuccess('Roadmap generated!');
    } catch (err: any) {
      setError(err.message || 'Failed to generate roadmap. Please try again.');
      console.error('Roadmap error:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
          Learning Roadmap
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Get a personalized learning path to reach your career goals
        </p>
      </div>

      {error   && <Alert variant="error"   onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="w-5 h-5" />
              Configure Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Target Role"
              placeholder="e.g., Staff Engineer"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
            />
            <div>
              <label className="label">Current Skills</label>
              <textarea
                className="input min-h-[100px]"
                placeholder="JavaScript, React, Node.js…"
                value={currentSkills}
                onChange={e => setCurrentSkills(e.target.value)}
              />
              <p className="text-xs text-secondary-500 mt-1">Separate skills with commas</p>
            </div>
            <div>
              <label className="label">Duration</label>
              <select
                className="input"
                value={duration}
                onChange={e => setDuration(e.target.value)}
              >
                {durationOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleGenerate}
              isLoading={generating}
              disabled={generating || !currentSkills.trim() || !targetRole.trim()}
              className="w-full"
              leftIcon={<Target className="w-4 h-4" />}
            >
              {generating ? 'Generating…' : 'Generate Roadmap'}
            </Button>
            {roadmap && !generating && (
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={generating}
                className="w-full"
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Regenerate
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your Learning Path</CardTitle>
          </CardHeader>
          <CardContent>
            {generating && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                <p className="text-sm text-secondary-500 text-center">
                  Building your personalized roadmap for <strong>{targetRole}</strong>…<br />
                  <span className="text-xs text-secondary-400">This may take a few seconds</span>
                </p>
              </div>
            )}

            {!generating && !roadmap && (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
                <p className="text-secondary-500 dark:text-secondary-400">
                  Configure your goals and generate a personalized roadmap
                </p>
              </div>
            )}

            {!generating && roadmap && roadmap.milestones.length === 0 && (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-warning-400 mx-auto mb-4" />
                <p className="text-secondary-500 dark:text-secondary-400 mb-4">
                  Couldn't build a roadmap this time. Try regenerating.
                </p>
                <Button variant="outline" size="sm" onClick={handleGenerate}>Try Again</Button>
              </div>
            )}

            {!generating && roadmap && roadmap.milestones.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                  <Calendar className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-secondary-900 dark:text-white">Estimated Duration</div>
                    <div className="text-sm text-secondary-500">{roadmap.estimated_duration}</div>
                  </div>
                  <Badge variant="primary" className="ml-auto">
                    {roadmap.milestones.length} phases
                  </Badge>
                </div>

                {roadmap.milestones.map((milestone, i) => (
                  <div
                    key={i}
                    className="border-l-2 border-primary-200 dark:border-primary-800 pl-4 py-2"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="primary">Week {milestone.week}</Badge>
                      <span className="font-semibold text-secondary-900 dark:text-white">
                        {milestone.title}
                      </span>
                    </div>

                    {milestone.objectives.length > 0 && (
                      <ul className="space-y-1 mb-3">
                        {milestone.objectives.map((obj, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-secondary-600 dark:text-secondary-400">
                            <CheckCircle className="w-4 h-4 text-success-500 flex-shrink-0 mt-0.5" />
                            {obj}
                          </li>
                        ))}
                      </ul>
                    )}

                    {milestone.resources.length > 0 && (
  <div className="flex flex-wrap gap-2">
    {milestone.resources.map((res, k) => {
      const parts = res.split('|');

      if (parts.length === 2) {
        const [title, url] = parts;

        return (
          <a
            key={k}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 bg-primary-100 dark:bg-primary-900/30 rounded-full text-primary-700 dark:text-primary-300 hover:underline"
          >
            📚 {title}
          </a>
        );
      }

      return (
        <span
          key={k}
          className="text-xs px-3 py-1 bg-secondary-100 dark:bg-secondary-700 rounded-full text-secondary-600 dark:text-secondary-400"
        >
          📚 {res}
        </span>
      );
    })}
  </div>
)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function RoadmapPage() {
  return (
    <ErrorBoundary>
      <RoadmapContent />
    </ErrorBoundary>
  );
}