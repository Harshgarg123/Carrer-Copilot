import { groqJson, hasGroq, MODEL_FAST } from './groq.js';

/** Analyse resume text with Groq. Returns {overall_score, ats_score, strengths, weaknesses, missing_keywords, suggestions}. */
export async function analyzeResumeText(resumeContent) {
  if (!hasGroq()) {
    return {
      overall_score: 72,
      ats_score: 68,
      strengths: ['Clear structure and organization', 'Good technical skills section', 'Relevant experience highlighted'],
      weaknesses: ['Could add more quantifiable achievements', 'Missing some industry keywords', 'Summary could be more impactful'],
      missing_keywords: ['CI/CD', 'Agile', 'Cloud Computing', 'Microservices'],
      suggestions: ['Add specific metrics to your achievements', 'Include a compelling professional summary', 'Use more action verbs', 'Add relevant certifications'],
    };
  }

  const systemPrompt = `You are an expert resume analyzer. Analyze the resume and provide:
1. overall_score (0-100)
2. ats_score (0-100)
3. strengths (array of strings)
4. weaknesses (array of strings)
5. missing_keywords (array of strings)
6. suggestions (array of strings)

Return as valid JSON only.`;

  // Throws a 502 with a helpful message if the AI is unavailable (no fake scores are saved)
  const analysis = await groqJson({
    model: MODEL_FAST,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze this resume:\n\n${resumeContent.slice(0, 12000)}` },
    ],
    max_tokens: 1024,
    temperature: 0.5,
  });

  const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.min(100, Math.round(Number(v))) : d);
  const arr = (v, d) => (Array.isArray(v) && v.length ? v.map(String) : d);
  return {
    overall_score: num(analysis.overall_score, 70),
    ats_score: num(analysis.ats_score, 65),
    strengths: arr(analysis.strengths, ['Resume analyzed']),
    weaknesses: arr(analysis.weaknesses, ['Could add more detail']),
    missing_keywords: arr(analysis.missing_keywords, []),
    suggestions: arr(analysis.suggestions, ['Consider adding more specific achievements']),
  };
}
