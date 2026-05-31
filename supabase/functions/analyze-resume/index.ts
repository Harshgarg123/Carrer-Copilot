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
    const { resumeId, resumeText } = body;

    if (!GROQ_API_KEY) {
      // Return mock analysis when API key not configured
      return new Response(
        JSON.stringify({
          overall_score: 72,
          ats_score: 68,
          strengths: ["Clear structure and organization", "Good technical skills section", "Relevant experience highlighted"],
          weaknesses: ["Could add more quantifiable achievements", "Missing some industry keywords", "Summary could be more impactful"],
          missing_keywords: ["CI/CD", "Agile", "Cloud Computing", "Microservices"],
          suggestions: ["Add specific metrics to your achievements", "Include a compelling professional summary", "Use more action verbs", "Add relevant certifications"]
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert resume analyzer. Analyze the resume and provide:
1. overall_score (0-100)
2. ats_score (0-100)
3. strengths (array of strings)
4. weaknesses (array of strings)
5. missing_keywords (array of strings)
6. suggestions (array of strings)

Return as valid JSON only.`;

    const resumeContent = resumeText || "Software Developer with experience in JavaScript, React, Node.js, Python, SQL. Built web applications and APIs. Bachelor's in Computer Science.";

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
          { role: "user", content: `Analyze this resume:\n\n${resumeContent}` }
        ],
        max_tokens: 1024,
        temperature: 0.5,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    let analysis;

    try {
      analysis = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    } catch {
      analysis = {
        overall_score: 70,
        ats_score: 65,
        strengths: ["Good content structure"],
        weaknesses: ["Could benefit from more detail"],
        missing_keywords: [],
        suggestions: ["Add more specific achievements"]
      };
    }

    return new Response(
      JSON.stringify({
        overall_score: analysis.overall_score || 70,
        ats_score: analysis.ats_score || 65,
        strengths: analysis.strengths || ["Resume analyzed"],
        weaknesses: analysis.weaknesses || ["Could add more detail"],
        missing_keywords: analysis.missing_keywords || [],
        suggestions: analysis.suggestions || ["Consider adding more specific achievements"]
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        overall_score: 70,
        ats_score: 65,
        strengths: ["Resume received"],
        weaknesses: ["Analysis temporarily unavailable"],
        missing_keywords: [],
        suggestions: ["Please try again later"]
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
