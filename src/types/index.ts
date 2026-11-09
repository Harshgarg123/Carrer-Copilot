export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  extracted_data: ResumeData;
  score?: number;
  ats_score?: number;
  created_at: string;
  updated_at: string;
}

export interface ResumeData {
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  summary?: string;
  experience?: Experience[];
  education?: Education[];
  skills?: string[];
  projects?: Project[];
  certifications?: string[];
  languages?: string[];
}

export interface Experience {
  title: string;
  company: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  current?: boolean;
  description?: string;
  achievements?: string[];
}

export interface Education {
  degree: string;
  field?: string;
  institution: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  gpa?: string;
  honors?: string[];
}

export interface Project {
  name: string;
  description?: string;
  technologies?: string[];
  link?: string;
  github?: string;
}

export interface ResumeAnalysis {
  id: string;
  resume_id: string;
  overall_score: number;
  ats_score: number;
  strengths: string[];
  weaknesses: string[];
  missing_keywords: string[];
  suggestions: string[];
  created_at: string;
}

export interface JobMatch {
  id: string;
  user_id: string;
  resume_id?: string;
  job_description: string;
  job_title?: string;
  company?: string;
  match_percentage: number;
  matched_skills: string[];
  missing_skills: string[];
  suggestions: string[];
  created_at: string;
}

export interface CoverLetter {
  id: string;
  user_id: string;
  resume_id?: string;
  job_match_id?: string;
  content: string;
  created_at: string;
}

export interface MockInterview {
  id: string;
  user_id: string;
  resume_id?: string;
  role: string;
  experience_level: 'junior' | 'mid' | 'senior' | 'lead';
  difficulty: 'easy' | 'medium' | 'hard';
  questions: InterviewQuestion[];
  total_score: number;
  feedback?: string;
  created_at: string;
  completed_at?: string;
}

export interface InterviewQuestion {
  id: string;
  interview_id: string;
  question: string;
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  user_answer?: string;
  ideal_answer?: string;
  score?: number;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  created_at: string;
  answered_at?: string;
}

export interface SkillGapAnalysis {
  id: string;
  user_id: string;
  current_skills: string[];
  target_role: string;
  missing_skills: SkillGapItem[];
  priority_skills: string[];
  recommendations: string[];
  created_at: string;
}

export interface SkillGapItem {
  skill: string;
  importance: 'critical' | 'important' | 'nice-to-have';
  reason?: string;
}

export interface LearningRoadmap {
  id: string;
  user_id: string;
  target_role: string;
  milestones: Milestone[];
  estimated_duration: string;
  created_at: string;
}

export interface Milestone {
  week: number;
  title: string;
  objectives: string[];
  resources: string[];
  projects?: string[];
}

export interface GitHubAnalysis {
  id: string;
  user_id: string;
  github_url: string;
  username: string;
  profile_data: GitHubProfileData;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  score?: number;
  created_at: string;
}

export interface GitHubProfileData {
  avatar_url?: string;
  bio?: string;
  location?: string;
  company?: string;
  public_repos?: number;
  followers?: number;
  following?: number;
  top_languages?: string[];
  top_repos?: {
    name: string;
    description?: string;
    stars: number;
    language?: string;
  }[];
}

export interface ProjectAnalysis {
  id: string;
  user_id: string;
  repo_url: string;
  repo_name: string;
  technologies: string[];
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  quality_score: number;
  created_at: string;
}

export interface GeneratedQuestion {
  id: string;
  user_id: string;
  source: 'resume' | 'skills' | 'github' | 'role';
  source_id?: string;
  category: string;
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface DashboardStats {
  resume_score: number;
  ats_score: number;
  job_readiness: number;
  interview_score: number;
  skills_improved: number;
  learning_progress: number;
}
