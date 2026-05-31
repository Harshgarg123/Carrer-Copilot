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

function fallbackQuestions(role: string, difficulty: string) {
  return [
    { id: generateUUID(), question: `Walk me through your background and what drew you to ${role}.`, category: "Behavioral", difficulty: "easy", hint: "Keep it concise" },
    { id: generateUUID(), question: `What's the most complex technical challenge you've faced as a ${role}?`, category: "Technical", difficulty, hint: "Use the STAR method" },
    { id: generateUUID(), question: "How do you ensure code quality and maintainability in your projects?", category: "Technical", difficulty: "medium", hint: "Mention testing and code review" },
    { id: generateUUID(), question: "Describe a time you had to learn a new technology quickly under pressure.", category: "Behavioral", difficulty: "medium", hint: "Focus on your learning process" },
    { id: generateUUID(), question: `How would you design a scalable system for a core feature in a ${role} product?`, category: "System Design", difficulty: "hard", hint: "Think about scalability and failure modes" },
  ];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const role = body.role || 'Software Engineer';
    const experienceLevel = body.experienceLevel || body.experience_level || 'mid';
    const difficulty = body.difficulty || 'medium';

    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ questions: fallbackQuestions(role, difficulty), interviewId: generateUUID() }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert technical interviewer at a top tech company.
Generate exactly 5 interview questions tailored to the role and experience level.

Return ONLY valid JSON — no markdown, no extra text:
{
  "questions": [
    {
      "question": "full interview question text",
      "category": "Technical | Behavioral | System Design | Problem Solving | Leadership",
      "difficulty": "easy | medium | hard",
      "hint": "one-line hint for the candidate"
    }
  ]
}

Rules:
- ALL questions must be SPECIFIC to the "${role}" role — no generic questions
- Mix: 2 Technical + 1 Behavioral + 1 System Design + 1 Problem Solving
- junior=easy/medium, mid=medium, senior/lead=medium/hard
- Each question answerable in 2-5 minutes verbally`;

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
          { role: 'user', content: `Role: ${role}\nExperience Level: ${experienceLevel}\nDifficulty: ${difficulty}` },
        ],
        max_tokens: 1500,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqRes.ok) {
      console.error('Groq error:', groqRes.status, await groqRes.text());
      return new Response(
        JSON.stringify({ questions: fallbackQuestions(role, difficulty), interviewId: generateUUID() }),
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

    let rawQuestions: any[] = [];
    if (Array.isArray(parsed.questions)) {
      rawQuestions = parsed.questions;
    } else if (parsed.questions && typeof parsed.questions === 'object') {
      rawQuestions = Object.values(parsed.questions);
    }

    if (rawQuestions.length === 0) {
      return new Response(
        JSON.stringify({ questions: fallbackQuestions(role, difficulty), interviewId: generateUUID() }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const questions = rawQuestions.slice(0, 5).map((q: any) => ({
      id: generateUUID(),
      question:   String(q?.question  || 'Describe your approach to a challenging problem.'),
      category:   String(q?.category  || 'Technical'),
      difficulty: String(q?.difficulty || difficulty),
      hint:       String(q?.hint      || 'Take your time and think out loud.'),
    }));

    return new Response(
      JSON.stringify({ questions, interviewId: generateUUID() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('generate-interview error:', error);
    return new Response(
      JSON.stringify({ questions: fallbackQuestions('Software Engineer', 'medium'), interviewId: generateUUID() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});