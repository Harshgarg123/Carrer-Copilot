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
    const { question, answer } = body;

    if (!GROQ_API_KEY) {
      const score = Math.floor(Math.random() * 30) + 60;
      return new Response(
        JSON.stringify({
          score,
          strengths: ["Clear communication", "Relevant experience mentioned"],
          weaknesses: ["Could provide more specific examples", "Consider adding metrics"],
          suggestions: ["Use the STAR method for behavioral questions", "Quantify your achievements"]
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an interview evaluator. Score the answer (0-100) and provide feedback. Return JSON with: score, strengths (array), weaknesses (array), suggestions (array)`;

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
          { role: "user", content: `Question: ${question}\nAnswer: ${answer}` }
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
      result = { score: 70, strengths: [], weaknesses: [], suggestions: [] };
    }

    return new Response(
      JSON.stringify({
        score: result.score || 70,
        strengths: result.strengths || ["Answer provided"],
        weaknesses: result.weaknesses || [],
        suggestions: result.suggestions || []
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ score: 70, strengths: [], weaknesses: [], suggestions: ["Try again"] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
