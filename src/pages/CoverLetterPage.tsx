import React, { useState } from 'react';
import { FileEdit, Copy, Download, RefreshCw, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateCoverLetter } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';

export function CoverLetterPage() {
  const { user } = useAuth();
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGenerate = async () => {
    if (!jobTitle.trim() || !company.trim() || !jobDescription.trim()) {
      setError('Please fill in job title, company, and job description');
      return;
    }

    setGenerating(true);
    setError('');
    setGeneratedLetter('');

    try {
      const response = await generateCoverLetter(
        jobTitle,
        company,
        jobDescription,
        additionalInfo
      );

      if (response.error) {
        throw new Error(response.error);
      }

      setGeneratedLetter(response.data.content);

      if (user) {
        await supabase.from('cover_letters').insert({
          user_id: user.id,
          job_title: jobTitle,
          company: company,
          content: response.data.content,
        });

        await supabase.from('user_activities').insert({
          user_id: user.id,
          activity_type: 'cover_letter',
          title: `Generated cover letter for ${jobTitle} at ${company}`,
        });
      }

      setSuccess('Cover letter generated!');
    } catch (err: any) {
      setError(err.message || 'Failed to generate cover letter');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const downloadLetter = () => {
    const blob = new Blob([generatedLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover_letter_${company.toLowerCase().replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
          Cover Letter Generator
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Create personalized cover letters tailored to job descriptions
        </p>
      </div>

      {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileEdit className="w-5 h-5" />
              Job Details
            </CardTitle>
            <CardDescription>Enter information about the position</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Job Title"
              placeholder="e.g., Senior Software Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />

            <Input
              label="Company Name"
              placeholder="e.g., Google"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />

            <Textarea
              label="Job Description"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[150px]"
            />

            <Textarea
              label="Additional Information (Optional)"
              placeholder="Any specific points you want to highlight (e.g., years of experience, key achievements)..."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
            />

            <Button
              onClick={handleGenerate}
              isLoading={generating}
              disabled={!jobTitle.trim() || !company.trim() || !jobDescription.trim()}
              className="w-full"
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Generate Cover Letter
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Cover Letter</CardTitle>
          </CardHeader>
          <CardContent>
            {generatedLetter ? (
              <div className="space-y-4">
                <div className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg whitespace-pre-wrap text-secondary-700 dark:text-secondary-300 text-sm leading-relaxed max-h-[400px] overflow-y-auto">
                  {generatedLetter}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant={copied ? 'accent' : 'outline'}
                    onClick={copyToClipboard}
                    leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  >
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={downloadLetter}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileEdit className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
                <p className="text-secondary-600 dark:text-secondary-400">
                  Fill in the job details and click generate to create your cover letter
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
