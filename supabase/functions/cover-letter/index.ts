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
    const { jobTitle, company, jobDescription, additionalInfo } = body;

    if (!GROQ_API_KEY) {
      const letter = `Dear Hiring Manager,

I am writing to express my strong interest in the ${jobTitle || 'Software Engineer'} position at ${company || 'your company'}. With my experience in software development and passion for creating innovative solutions, I am excited about the opportunity to contribute to your team.

In my previous roles, I have successfully delivered projects that improved system performance and user experience. My technical skills and collaborative approach make me well-suited for this position.

I am particularly drawn to ${company || 'your company'} for its commitment to innovation and excellence. I would welcome the opportunity to bring my expertise and enthusiasm to your team.

Thank you for considering my application. I look forward to discussing how I can contribute to your continued success.

Best regards`;
      return new Response(
        JSON.stringify({ content: letter }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert cover letter writer. Create a professional, personalized cover letter that is concise (max 300 words). Write in a warm, professional tone.`;

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
          { role: "user", content: `Write a cover letter for:\nJob: ${jobTitle}\nCompany: ${company}\nJD: ${jobDescription}\nAdditional: ${additionalInfo || 'N/A'}` }
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Unable to generate cover letter.";

    return new Response(
      JSON.stringify({ content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ content: "Error generating cover letter. Please try again." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
