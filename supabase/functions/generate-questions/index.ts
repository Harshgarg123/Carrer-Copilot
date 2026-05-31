import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function fallbackQuestions(source: string, targetRole?: string, skill?: string) {
  const topic = source === 'role' ? targetRole : source === 'skills' ? skill : 'Software Engineering';
  return [
    { id: generateUUID(), question: `What are the core responsibilities of a ${topic} professional?`, category: "Behavioral", difficulty: "easy", hint: "Focus on day-to-day responsibilities" },
    { id: generateUUID(), question: `Explain a key technical concept fundamental to ${topic}.`, category: "Technical", difficulty: "medium", hint: "Use clear examples" },
    { id: generateUUID(), question: `How would you architect a scalable system relevant to ${topic}?`, category: "System Design", difficulty: "hard", hint: "Consider scalability and trade-offs" },
    { id: generateUUID(), question: `Describe a challenging project you worked on related to ${topic}.`, category: "Behavioral", difficulty: "medium", hint: "Use the STAR method" },
    { id: generateUUID(), question: `What are the best practices and common pitfalls in ${topic}?`, category: "Technical", difficulty: "medium", hint: "Draw from real experience" },
  ];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { source = 'general', targetRole, skill } = body;

    const topic = source === 'role'
      ? (targetRole || 'Software Engineer')
      : source === 'skills'
      ? (skill || 'JavaScript')
      : 'general software engineering';

    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ questions: fallbackQuestions(source, targetRole, skill) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sourceContext = source === 'role'
      ? `for someone interviewing for the role: ${topic}`
      : source === 'skills'
      ? `focused specifically on the skill: ${topic}`
      : `general software engineering interview questions`;

    const systemPrompt = `You are an expert technical interviewer. Generate exactly 8 interview questions ${sourceContext}.

Return ONLY valid JSON — no markdown, no extra text:
{
  "questions": [
    {
      "question": "full interview question text",
      "category": "Technical | Behavioral | System Design | Problem Solving | Leadership | Process",
      "difficulty": "easy | medium | hard",
      "hint": "one-line hint to guide the candidate"
    }
  ]
}

Rules:
- ALL questions must be SPECIFIC and relevant to: ${topic}
- Mix difficulties: 2 easy + 4 medium + 2 hard
- Mix categories: 3 Technical + 2 Behavioral + 1 System Design + 1 Problem Solving + 1 Process
- No generic or vague questions
- Each question should be answerable in 2-5 minutes`;

    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate 8 interview questions ${sourceContext}.` },
        ],
        max_tokens: 2000,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqRes.ok) {
      console.error('Groq error:', groqRes.status, await groqRes.text());
      return new Response(
        JSON.stringify({ questions: fallbackQuestions(source, targetRole, skill) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqData = await groqRes.json();
    let parsed: { questions?: any[] } = {};
    try {
      parsed = JSON.parse(groqData.choices?.[0]?.message?.content || '{}');
    } catch {
      parsed = {};
    }

    // Normalise — AI can return array or object
    let rawQuestions: any[] = [];
    if (Array.isArray(parsed.questions)) {
      rawQuestions = parsed.questions;
    } else if (parsed.questions && typeof parsed.questions === 'object') {
      rawQuestions = Object.values(parsed.questions);
    }

    if (rawQuestions.length === 0) {
      return new Response(
        JSON.stringify({ questions: fallbackQuestions(source, targetRole, skill) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const questions = rawQuestions.slice(0, 8).map((q: any) => ({
      id: generateUUID(),
      question:   String(q?.question  || 'Describe your experience with this topic.'),
      category:   String(q?.category  || 'Technical'),
      difficulty: String(q?.difficulty || 'medium'),
      hint:       String(q?.hint      || 'Take your time and structure your answer.'),
    }));

    return new Response(
      JSON.stringify({ questions }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('generate-questions error:', error);
    return new Response(
      JSON.stringify({ questions: fallbackQuestions('general') }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});