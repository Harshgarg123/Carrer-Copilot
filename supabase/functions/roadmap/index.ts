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
    const { currentSkills, targetRole, duration } = body;

    const defaultMilestones = [
      { week: 1, title: "Foundation Building", objectives: ["Set up development environment", "Review core concepts", "Create study plan"], resources: ["Documentation", "Online courses"] },
      { week: 2, title: "Core Skills Development", objectives: ["Learn fundamental frameworks", "Build practice projects", "Code review best practices"], resources: ["Tutorials", "GitHub examples"] },
      { week: 3, title: "Advanced Topics", objectives: ["Deep dive into advanced concepts", "System design practice", "Performance optimization"], resources: ["Architecture blogs", "Case studies"] },
      { week: 4, title: "Portfolio & Practice", objectives: ["Complete portfolio project", "Mock interviews", "Resume refinement"], resources: ["Interview prep sites", "Portfolio templates"] },
    ];

    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ milestones: defaultMilestones, estimated_duration: duration || "3 months" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a learning roadmap generator. Create a structured learning plan. Return JSON with:
1. milestones (array of {week: number, title: string, objectives: array, resources: array})
2. estimated_duration (string)`;

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
          { role: "user", content: `Skills: ${(currentSkills || []).join(', ')}\nTarget: ${targetRole}\nDuration: ${duration}` }
        ],
        max_tokens: 2048,
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    let result;

    try {
      result = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    } catch {
      result = { milestones: defaultMilestones, estimated_duration: duration || "3 months" };
    }

    return new Response(
      JSON.stringify({
        milestones: result.milestones || defaultMilestones,
        estimated_duration: result.estimated_duration || duration || "3 months"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ milestones: [], estimated_duration: "3 months" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
