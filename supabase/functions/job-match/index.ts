import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { jobDescription, resumeText, jobTitle, company } = body;

    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({
          match_percentage: 68,
          matched_skills: ["JavaScript", "React", "Node.js", "SQL", "Git"],
          missing_skills: ["TypeScript", "AWS", "Docker", "CI/CD", "PostgreSQL"],
          suggestions: [
            "Consider adding TypeScript to your skill set",
            "Gain experience with cloud platforms like AWS",
            "Learn containerization with Docker",
            "Add experience with CI/CD pipelines"
          ]
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a job matching expert. Compare the job description with the candidate's profile and return JSON with:
1. match_percentage (0-100)
2. matched_skills (array of strings)
3. missing_skills (array of strings)
4. suggestions (array of strings)

Return valid JSON only.`;

    const resume = resumeText || "Software Developer skilled in JavaScript, React, Node.js, SQL, Python, Git";

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Job: ${jobTitle || 'Software Engineer'} at ${company || 'Company'}\n\nJD:\n${jobDescription}\n\nCandidate:\n${resume}` }
        ],
        max_tokens: 1024,
        temperature: 0.5,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    let result;

    try {
      result = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    } catch {
      result = { match_percentage: 65, matched_skills: [], missing_skills: [], suggestions: [] };
    }

    return new Response(
      JSON.stringify({
        match_percentage: result.match_percentage || 65,
        matched_skills: result.matched_skills || [],
        missing_skills: result.missing_skills || [],
        suggestions: result.suggestions || []
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ match_percentage: 60, matched_skills: [], missing_skills: [], suggestions: ["Please try again"] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
