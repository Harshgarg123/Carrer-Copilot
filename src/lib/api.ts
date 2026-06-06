const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export async function callEdgeFunction<T>(
  functionName: string,
  payload: Record<string, unknown>
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `Failed to call ${functionName}` };
    }

    return { data };
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error);
    return { error: 'Network error. Please try again.' };
  }
}

// AI Mentor
export async function sendMentorMessage(message: string, history: any[] = []) {
  return callEdgeFunction<any>('ai-mentor', { message, history });
}

// Resume Analysis
export async function analyzeResume(resumeId: string, resumeText?: string) {
  return callEdgeFunction<any>('analyze-resume', { resumeId, resumeText });
}

// Job Match
export async function analyzeJobMatch(
  jobDescription: string,
  resumeText?: string,
  jobTitle?: string,
  company?: string
) {
  return callEdgeFunction<any>('job-match', {
    jobDescription,
    resumeText,
    jobTitle,
    company
  });
}

// Cover Letter
export async function generateCoverLetter(
  jobTitle: string,
  company: string,
  jobDescription: string,
  additionalInfo?: string
) {
  return callEdgeFunction<{ content: string }>('cover-letter', {
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
  return callEdgeFunction<{ questions: any[], interviewId: string }>('generate-interview', {
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
  difficulty?: string,
) {
  return callEdgeFunction<any>('evaluate-answer', {
    questionId,
    question,
    answer,
    interviewId,
    category,
    difficulty,
  });
}

// Skill Gap Analysis
export async function analyzeSkillGap(
  currentSkills: string[],
  targetRole: string
) {
  return callEdgeFunction<any>('skill-gap', { currentSkills, targetRole });
}

// Learning Roadmap
export async function generateRoadmap(
  currentSkills: string[],
  targetRole: string,
  duration: string
) {
  return callEdgeFunction<any>('roadmap', { currentSkills, targetRole, duration });
}

// GitHub Analysis
export async function analyzeGithubProfile(githubUrl: string, username: string) {
  return callEdgeFunction<any>('github-analysis', { githubUrl, username });
}

// Project Analysis
export async function analyzeProject(repoUrl: string, repoName: string) {
  return callEdgeFunction<any>('project-analysis', { repoUrl, repoName });
}

// Question Generator
export async function generateQuestions(
  source: string,
  targetRole?: string,
  skill?: string
) {
  return callEdgeFunction<{ questions: any[] }>('generate-questions', {
    source,
    targetRole,
    skill,
  });
}