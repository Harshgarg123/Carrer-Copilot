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
    const { currentSkills, targetRole } = body;

    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({
          missing_skills: ["System Design", "Cloud Architecture", "CI/CD", "Container Orchestration", "Distributed Systems"],
          priority_skills: ["System Design", "Cloud Architecture", "CI/CD"],
          recommendations: [
            "Focus on learning system design principles",
            "Get hands-on experience with AWS or GCP",
            "Build projects using containerization",
            "Contribute to open source projects"
          ]
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a career skills analyst. Analyze the gap between current skills and target role. Return JSON with:
1. missing_skills (array)
2. priority_skills (array of top 3)
3. recommendations (array)`;

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
          { role: "user", content: `Current skills: ${(currentSkills || []).join(', ')}\nTarget role: ${targetRole || 'Senior Software Engineer'}` }
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
      result = { missing_skills: [], priority_skills: [], recommendations: [] };
    }

    return new Response(
      JSON.stringify({
        missing_skills: result.missing_skills || [],
        priority_skills: result.priority_skills || [],
        recommendations: result.recommendations || []
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ missing_skills: [], priority_skills: [], recommendations: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
