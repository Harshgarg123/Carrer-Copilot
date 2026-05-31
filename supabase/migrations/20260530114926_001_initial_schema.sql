/*
  # Initial Database Schema for AI Career Copilot

  1. New Tables
    - profiles: User profile information
    - resumes: Uploaded resume files and extracted data
    - resume_analyses: AI-generated resume analysis results
    - job_matches: Job description comparison results
    - cover_letters: Generated cover letters
    - mock_interviews: Interview session data
    - interview_questions: Individual interview questions
    - skill_gap_analyses: Skill gap assessment results
    - learning_roadmaps: Personalized learning plans
    - github_analyses: GitHub profile analysis results
    - project_analyses: Repository analysis results
    - generated_questions: AI-generated interview questions
    - user_activities: User activity tracking
    - career_stats: Dashboard statistics

  2. Security
    - Enable RLS on all tables
    - Policies restrict data access to authenticated users and their own data
*/

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Resumes Table
CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  extracted_data jsonb DEFAULT '{}'::jsonb,
  score integer DEFAULT 0,
  ats_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resumes"
  ON resumes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own resumes"
  ON resumes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes"
  ON resumes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes"
  ON resumes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Resume Analyses Table
CREATE TABLE IF NOT EXISTS resume_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score integer DEFAULT 0,
  ats_score integer DEFAULT 0,
  strengths jsonb DEFAULT '[]'::jsonb,
  weaknesses jsonb DEFAULT '[]'::jsonb,
  missing_keywords jsonb DEFAULT '[]'::jsonb,
  suggestions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE resume_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resume analyses"
  ON resume_analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own resume analyses"
  ON resume_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Job Matches Table
CREATE TABLE IF NOT EXISTS job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL,
  job_description text NOT NULL,
  job_title text DEFAULT '',
  company text DEFAULT '',
  match_percentage integer DEFAULT 0,
  matched_skills jsonb DEFAULT '[]'::jsonb,
  missing_skills jsonb DEFAULT '[]'::jsonb,
  suggestions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own job matches"
  ON job_matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own job matches"
  ON job_matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own job matches"
  ON job_matches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Cover Letters Table
CREATE TABLE IF NOT EXISTS cover_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL,
  job_match_id uuid REFERENCES job_matches(id) ON DELETE SET NULL,
  content text NOT NULL,
  job_title text DEFAULT '',
  company text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cover letters"
  ON cover_letters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cover letters"
  ON cover_letters FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cover letters"
  ON cover_letters FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Mock Interviews Table
CREATE TABLE IF NOT EXISTS mock_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL,
  role text NOT NULL,
  experience_level text NOT NULL CHECK (experience_level IN ('junior', 'mid', 'senior', 'lead')),
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  total_score integer DEFAULT 0,
  feedback text DEFAULT '',
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE mock_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mock interviews"
  ON mock_interviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mock interviews"
  ON mock_interviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mock interviews"
  ON mock_interviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Interview Questions Table
CREATE TABLE IF NOT EXISTS interview_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES mock_interviews(id) ON DELETE CASCADE,
  question text NOT NULL,
  category text DEFAULT 'technical',
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  user_answer text DEFAULT '',
  ideal_answer text DEFAULT '',
  score integer DEFAULT 0,
  strengths jsonb DEFAULT '[]'::jsonb,
  weaknesses jsonb DEFAULT '[]'::jsonb,
  suggestions jsonb DEFAULT '[]'::jsonb,
  question_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  answered_at timestamptz
);

ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interview questions"
  ON interview_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_interviews
      WHERE mock_interviews.id = interview_questions.interview_id
      AND mock_interviews.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own interview questions"
  ON interview_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_interviews
      WHERE mock_interviews.id = interview_questions.interview_id
      AND mock_interviews.user_id = auth.uid()
    )
  );

-- Skill Gap Analyses Table
CREATE TABLE IF NOT EXISTS skill_gap_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_skills jsonb DEFAULT '[]'::jsonb,
  target_role text NOT NULL,
  missing_skills jsonb DEFAULT '[]'::jsonb,
  priority_skills jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE skill_gap_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skill gap analyses"
  ON skill_gap_analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own skill gap analyses"
  ON skill_gap_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Learning Roadmaps Table
CREATE TABLE IF NOT EXISTS learning_roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_role text NOT NULL,
  milestones jsonb DEFAULT '[]'::jsonb,
  estimated_duration text DEFAULT '',
  progress integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE learning_roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learning roadmaps"
  ON learning_roadmaps FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own learning roadmaps"
  ON learning_roadmaps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning roadmaps"
  ON learning_roadmaps FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- GitHub Analyses Table
CREATE TABLE IF NOT EXISTS github_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_url text NOT NULL,
  username text NOT NULL,
  profile_data jsonb DEFAULT '{}'::jsonb,
  strengths jsonb DEFAULT '[]'::jsonb,
  weaknesses jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  score integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE github_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own github analyses"
  ON github_analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own github analyses"
  ON github_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Project Analyses Table
CREATE TABLE IF NOT EXISTS project_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_url text NOT NULL,
  repo_name text NOT NULL,
  technologies jsonb DEFAULT '[]'::jsonb,
  summary text DEFAULT '',
  strengths jsonb DEFAULT '[]'::jsonb,
  weaknesses jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  quality_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project analyses"
  ON project_analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own project analyses"
  ON project_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Generated Questions Table
CREATE TABLE IF NOT EXISTS generated_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('resume', 'skills', 'github', 'role')),
  source_id uuid,
  category text NOT NULL,
  questions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE generated_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated questions"
  ON generated_questions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own generated questions"
  ON generated_questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User Activities Table
CREATE TABLE IF NOT EXISTS user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities"
  ON user_activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activities"
  ON user_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Career Stats Table
CREATE TABLE IF NOT EXISTS career_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_score integer DEFAULT 0,
  ats_score integer DEFAULT 0,
  job_readiness integer DEFAULT 0,
  interview_score integer DEFAULT 0,
  skills_improved integer DEFAULT 0,
  learning_progress integer DEFAULT 0,
  total_interviews integer DEFAULT 0,
  total_resumes integer DEFAULT 0,
  total_cover_letters integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE career_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own career stats"
  ON career_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own career stats"
  ON career_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own career stats"
  ON career_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_user_id ON resume_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_user_id ON job_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_cover_letters_user_id ON cover_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_interviews_user_id ON mock_interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_interview_id ON interview_questions(interview_id);
CREATE INDEX IF NOT EXISTS idx_skill_gap_analyses_user_id ON skill_gap_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_roadmaps_user_id ON learning_roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_github_analyses_user_id ON github_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_project_analyses_user_id ON project_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  INSERT INTO public.career_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
