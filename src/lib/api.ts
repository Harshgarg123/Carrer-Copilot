/**
 * Client for the Express + MongoDB API (see /server).
 * In development Vite proxies "/api" to the server; in production the same server serves the app.
 * Set VITE_API_URL only if the API is hosted on a different origin.
 */
const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'ai_career_copilot_token';

export const UNAUTHORIZED_EVENT = 'auth:unauthorized';

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
  key: TOKEN_KEY,
};

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status?: number;
}

type RequestBody = Record<string, unknown> | FormData | undefined;

export async function request<T>(
  method: string,
  path: string,
  body?: RequestBody,
  options: { auth?: boolean } = {}
): Promise<ApiResponse<T>> {
  const { auth = true } = options;
  try {
    const headers: Record<string, string> = {};
    const token = tokenStore.get();
    if (auth && token) headers['Authorization'] = `Bearer ${token}`;

    let payload: BodyInit | undefined;
    if (body instanceof FormData) {
      payload = body; // browser sets the multipart boundary
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });

    let data: unknown = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      // Expired / invalid session on a protected call -> tell the AuthProvider to sign out
      if (response.status === 401 && auth && token) {
        tokenStore.clear();
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      }
      let message = (data as { error?: string } | null)?.error;
      if (!message) {
        message =
          response.status === 404
            ? 'API not found (404). The backend server is not reachable at this address - see the deployment notes in the README.'
            : `Request failed (${response.status})`;
      }
      return { error: message, status: response.status };
    }

    return { data: data as T, status: response.status };
  } catch (error) {
    console.error(`Error calling ${method} ${path}:`, error);
    return { error: 'Network error. Please check your connection and try again.' };
  }
}

const post = <T>(path: string, body?: Record<string, unknown>) => request<T>('POST', path, body ?? {});

/* ───────────────────────── Auth ───────────────────────── */

export interface ApiUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export const authApi = {
  signUp: (email: string, password: string, fullName?: string) =>
    request<{ token: string; user: ApiUser }>(
      'POST',
      '/api/auth/signup',
      { email, password, full_name: fullName ?? '' },
      { auth: false }
    ),
  signIn: (email: string, password: string) =>
    request<{ token: string; user: ApiUser }>('POST', '/api/auth/login', { email, password }, { auth: false }),
  me: () => request<{ user: ApiUser }>('GET', '/api/auth/me'),
  forgotPassword: (email: string) =>
    request<{ ok: boolean }>('POST', '/api/auth/forgot-password', { email }, { auth: false }),
  resetPassword: (token: string, password: string) =>
    request<{ ok: boolean }>('POST', '/api/auth/reset-password', { token, password }, { auth: false }),
  updateProfile: (updates: { full_name?: string; avatar_url?: string }) =>
    request<{ user: ApiUser }>('PATCH', '/api/profile', updates),
};

/* ───────────────────────── AI features ───────────────────────── */

// AI Mentor
export async function sendMentorMessage(message: string, history: any[] = []) {
  return post<any>('/api/ai/ai-mentor', { message, history });
}

// Resume Analysis (the server reads the stored file, analyzes it and saves the scores)
export async function analyzeResume(resumeId: string) {
  return post<any>(`/api/resumes/${encodeURIComponent(resumeId)}/analyze`);
}

// Job Match
export async function analyzeJobMatch(
  jobDescription: string,
  resumeText?: string,
  jobTitle?: string,
  company?: string,
  resumeId?: string
) {
  return post<any>('/api/ai/job-match', {
    jobDescription,
    resumeText,
    jobTitle,
    company,
    resumeId,
  });
}

// Cover Letter
export async function generateCoverLetter(
  jobTitle: string,
  company: string,
  jobDescription: string,
  additionalInfo?: string
) {
  return post<{ content: string }>('/api/ai/cover-letter', {
    jobTitle,
    company,
    jobDescription,
    additionalInfo,
  });
}

// Mock Interview
export async function generateInterviewQuestions(
  role: string,
  experienceLevel: string,
  difficulty: string
) {
  return post<{ questions: any[]; interviewId: string }>('/api/ai/generate-interview', {
    role,
    experienceLevel,
    difficulty,
  });
}

export async function evaluateInterviewAnswer(
  questionId: string,
  question: string,
  answer: string,
  interviewId: string,
  category?: string,
  difficulty?: string
) {
  return post<any>('/api/ai/evaluate-answer', {
    questionId,
    question,
    answer,
    interviewId,
    category,
    difficulty,
  });
}

// Skill Gap Analysis
export async function analyzeSkillGap(currentSkills: string[], targetRole: string) {
  return post<any>('/api/ai/skill-gap', { currentSkills, targetRole });
}

// Learning Roadmap
export async function generateRoadmap(
  currentSkills: string[],
  targetRole: string,
  duration: string
) {
  return post<any>('/api/ai/roadmap', { currentSkills, targetRole, duration });
}

// GitHub Analysis
export async function analyzeGithubProfile(githubUrl: string, username: string) {
  return post<any>('/api/ai/github-analysis', { githubUrl, username });
}

// Project Analysis
export async function analyzeProject(repoUrl: string, repoName: string) {
  return post<any>('/api/ai/project-analysis', { repoUrl, repoName });
}

// Question Generator
export async function generateQuestions(source: string, targetRole?: string, skill?: string) {
  return post<{ questions: any[] }>('/api/ai/generate-questions', {
    source,
    targetRole,
    skill,
  });
}

/* ───────────────────────── Data (MongoDB) ───────────────────────── */

export interface ResumeRecord {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  score: number;
  ats_score: number;
  created_at: string;
}

export type RecordType =
  | 'job_matches'
  | 'cover_letters'
  | 'skill_gap_analyses'
  | 'learning_roadmaps'
  | 'github_analyses'
  | 'project_analyses'
  | 'generated_questions';

export interface CareerStats {
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

export interface ActivityItem {
  id: string;
  activity_type: string;
  title: string;
  created_at: string;
}

export const resumesApi = {
  list: () => request<{ resumes: ResumeRecord[] }>('GET', '/api/resumes'),
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ resume: ResumeRecord }>('POST', '/api/resumes', form);
  },
  remove: (id: string) => request<{ ok: boolean }>('DELETE', `/api/resumes/${encodeURIComponent(id)}`),

  /** Open the stored file in a new tab (the file endpoint needs the auth header, so we fetch it as a blob). */
  async open(id: string): Promise<string | null> {
    // Open the tab synchronously (inside the click handler) so popup blockers allow it
    const win = window.open('', '_blank');
    try {
      const token = tokenStore.get();
      const response = await fetch(`${API_BASE}/api/resumes/${encodeURIComponent(id)}/file`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Could not load the file');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (win) {
        win.location.href = url;
      } else {
        window.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return null;
    } catch (err) {
      win?.close();
      return err instanceof Error ? err.message : 'Could not open the resume';
    }
  },
};

/** Save an analysis/result for the signed-in user. Never throws (errors are returned, not thrown). */
export function saveRecord(type: RecordType, payload: Record<string, unknown>) {
  return request<{ record: { id: string } }>('POST', `/api/records/${type}`, payload);
}

/** Record user activity for the dashboard feed. Never throws. */
export function logActivity(
  activity_type: string,
  title: string,
  metadata?: Record<string, unknown>
) {
  return request<{ ok: boolean }>('POST', '/api/activities', {
    activity_type,
    title,
    metadata: metadata ?? {},
  });
}

export const interviewsApi = {
  start: (role: string, experience_level: string, difficulty: string) =>
    request<{ interview: { id: string } }>('POST', '/api/interviews', {
      role,
      experience_level,
      difficulty,
    }),
  saveQuestion: (interviewId: string, payload: Record<string, unknown>) =>
    request<{ question: { id: string } }>(
      'POST',
      `/api/interviews/${encodeURIComponent(interviewId)}/questions`,
      payload
    ),
  complete: (interviewId: string, total_score: number) =>
    request<{ total_score: number }>(
      'POST',
      `/api/interviews/${encodeURIComponent(interviewId)}/complete`,
      { total_score }
    ),
};

export const customRolesApi = {
  list: () => request<{ roles: string[] }>('GET', '/api/custom-roles'),
  add: (role_name: string) => request<{ role_name: string }>('POST', '/api/custom-roles', { role_name }),
  remove: (role_name: string) =>
    request<{ ok: boolean }>('DELETE', `/api/custom-roles?role_name=${encodeURIComponent(role_name)}`),
};

export const dashboardApi = {
  get: () => request<{ stats: CareerStats; activities: ActivityItem[] }>('GET', '/api/dashboard'),
};
