import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFIER — labels the answer type so AI gets explicit context
// ─────────────────────────────────────────────────────────────────────────────
function classifyAnswer(answer: string): { type: "empty" | "gibberish" | "repetitive" | "real"; detail: string } {
  const trimmed = answer.trim();
  const lower   = trimmed.toLowerCase();

  if (trimmed.length < 15) {
    return { type: "empty", detail: "The response is fewer than 15 characters — nothing meaningful provided." };
  }

  // Repeated-character mash (ddddd, wwwww, fffff)
  const noSpaces = lower.replace(/\s/g, "");
  const charFreq: Record<string, number> = {};
  for (const ch of noSpaces) charFreq[ch] = (charFreq[ch] || 0) + 1;
  const maxFreq = Math.max(...Object.values(charFreq));
  if (noSpaces.length > 8 && maxFreq / noSpaces.length > 0.50) {
    return { type: "gibberish", detail: `Keyboard mash detected: ${Math.round(maxFreq / noSpaces.length * 100)}% of characters are the same letter. This is not an answer.` };
  }


  // Repeated-word spam (no no no nono nono)
  const words      = lower.split(/\s+/).filter(Boolean);
  const uniqueSet  = new Set(words);
  const uniqueRatio = uniqueSet.size / words.length;
  if (words.length > 5 && uniqueRatio < 0.25) {
    return { type: "repetitive", detail: `Word spam detected: only ${uniqueSet.size} unique words out of ${words.length} total. This is not an answer.` };
  }

  // No vowels
  const vowels     = (lower.match(/[aeiou]/g)              || []).length;
  const consonants = (lower.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
  const letters    = vowels + consonants;
  if (letters > 15 && vowels / letters < 0.12) {
    return { type: "gibberish", detail: "Response contains almost no vowels — not readable language." };
  }

  return { type: "real", detail: "" };
}

// ─────────────────────────────────────────────────────────────────────────────
// EDGE FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body       = await req.json();
    const question   = String(body.question   || "").trim();
    const answerText = String(body.answer     || "").trim();
    const category   = String(body.category   || "General");
    const difficulty = String(body.difficulty || "medium");

    if (!question) {
      return new Response(JSON.stringify({ error: "question is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const classification = classifyAnswer(answerText);
    const maxAllowed     = classification.type === "real" ? 100 : 5;

    // ── No API key: honest local scoring, never fake 70 ──────────────────────
    if (!GROQ_API_KEY) {
      if (classification.type !== "real") {
        return new Response(JSON.stringify({
          score: 0, strengths: [],
          weaknesses:  [classification.detail, "No technical content found."],
          suggestions: [`Please genuinely attempt: "${question.substring(0, 80)}…"`],
          verdict: "no_attempt",
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const uWords = new Set(answerText.toLowerCase().split(/\s+/).filter(Boolean));
      const score  = uWords.size >= 50 ? 58 : uWords.size >= 25 ? 45 : uWords.size >= 12 ? 32 : 20;
      return new Response(JSON.stringify({
        score, strengths: ["Contains genuine content"],
        weaknesses: ["AI evaluator not configured — score is estimated"],
        suggestions: ["Deploy with GROQ_API_KEY set for accurate evaluation"],
        verdict: "fallback_heuristic",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Build the user message with context about answer quality ──────────────
    const answerBlock = classification.type === "real"
      ? `Candidate's answer:\n${answerText}`
      : `⚠ ANSWER QUALITY ALERT — ${classification.detail}\n\nCandidate's raw input:\n${answerText}`;

    // ── System prompt: RELEVANCE-FIRST evaluation ─────────────────────────────
    const systemPrompt = `
You are a FAANG interviewer.

Your FIRST task is NOT scoring.

Your FIRST task is:

"Would a human interviewer consider this answer to be answering the question?"

If NO:

score MUST be between 0 and 10.

Examples:

Question:
What is null vs undefined?

Answer:
I optimized frontend performance using lazy loading.

Score: 0

Question:
Design a checkout flow in React.

Answer:
I improved application performance by reducing bundle size.

Score: 0

Question:
What are CSS Grid pitfalls?

Answer:
I optimized frontend performance.

Score: 0

Question:
Tell me about a time you optimized frontend performance.

Answer:
I optimized bundle size, lazy loaded components and reduced render cycles.

Score: 80+

RULES:

1. Being technical is NOT enough.
2. Being well written is NOT enough.
3. Being software related is NOT enough.
4. The answer must specifically answer THIS question.
5. If the answer would fail an interview because it ignored the question, score <= 10.

Return JSON:

{
  "relevance": number,
  "score": number,
  "strengths": [],
  "weaknesses": [],
  "suggestions": [],
  "verdict": ""
}
`;

    const groqRes = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: `Question: ${question}\n\n${answerBlock}` },
        ],
        max_tokens: 1200,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqRes.ok) {
      console.error("Groq error:", groqRes.status, await groqRes.text());
      return new Response(JSON.stringify({
        score: 0, strengths: [], weaknesses: ["Evaluation service unavailable."],
        suggestions: ["Please try again."], verdict: "error",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const groqData = await groqRes.json();
    let result: any = {};
    try { result = JSON.parse(groqData.choices?.[0]?.message?.content || "{}"); }
    catch { result = {}; }

    // Hard cap: gibberish/empty detected locally → AI cannot give > 5 no matter what
    const rawScore   = typeof result.score === "number" ? result.score : 0;
    const finalScore = Math.max(0, Math.min(maxAllowed, Math.round(rawScore)));
const relevance = Number(result.relevance || 0);
let score = Number(result.score || 0);

if (relevance < 20) {
  score = Math.min(score, 20);
}

if (relevance === 0) {
  score = 0;
}

const finalScore = Math.max(
  0,
  Math.min(maxAllowed, Math.round(score))
);
    return new Response(
  JSON.stringify({
    relevance,
    score: finalScore,
    strengths: Array.isArray(result.strengths)
      ? result.strengths
      : [],
    weaknesses: Array.isArray(result.weaknesses)
      ? result.weaknesses
      : [],
    suggestions: Array.isArray(result.suggestions)
      ? result.suggestions
      : [],
    verdict: result.verdict || "poor",
  }),
  {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  }
);

  } catch (error) {
    console.error("evaluate-answer fatal:", error);
    return new Response(JSON.stringify({
      score: 0, strengths: [], weaknesses: ["Internal evaluation error."],
      suggestions: ["Please try again."], verdict: "error",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});