import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEFAULT_PROMPT = `You are Helping Hand AI, a helpful AI assistant for students. You help with:
- Study tips and techniques
- Explaining academic concepts
- Time management and organization
- Homework and assignment help
- Test preparation strategies
- Wellness and stress management

Be encouraging, supportive, and provide practical advice. Keep responses concise but helpful.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate the calling user
    const authHeader = req.headers.get("Authorization") ?? "";
    const userToken = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${userToken}` } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser(userToken);
    if (!userData.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = userData.user.id;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Load existing config
    const { data: config } = await serviceClient
      .from("ai_config")
      .select("system_prompt, improvements_log")
      .eq("user_id", userId)
      .maybeSingle();

    const currentPrompt = config?.system_prompt ?? DEFAULT_PROMPT;
    const improvementsLog: object[] = config?.improvements_log ?? [];

    // Fetch recent conversations (last 30 messages)
    const { data: recentMessages } = await serviceClient
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!recentMessages || recentMessages.length < 4) {
      return new Response(
        JSON.stringify({ message: "Not enough conversation history yet. Keep chatting and try again!", improved: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const conversationSummary = recentMessages
      .reverse()
      .map((m: { role: string; content: string }) => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join("\n");

    // Ask GPT-4o to analyze conversations and rewrite the system prompt
    const analysisPrompt = `You are an AI meta-trainer. Your job is to analyze recent conversations between a user and an AI assistant, then rewrite the assistant's system prompt to make it more personalized and effective for this specific user.

CURRENT SYSTEM PROMPT:
${currentPrompt}

RECENT CONVERSATIONS:
${conversationSummary}

PREVIOUS IMPROVEMENTS LOG:
${JSON.stringify(improvementsLog.slice(-5))}

Based on the conversations above, identify:
1. What topics/subjects this user frequently asks about
2. What communication style works best for them (detailed vs concise, formal vs casual)
3. Any specific areas of knowledge they seem to need more help with
4. Their apparent goals and context

Then write an IMPROVED system prompt that:
- Preserves the core helpful, encouraging personality
- Is better tailored to this specific user's needs and style
- Incorporates relevant domain knowledge they care about
- Stays under 400 words

Respond with a JSON object in this exact format:
{
  "improved_prompt": "<the new system prompt>",
  "changes_summary": "<1-2 sentences describing what changed and why>",
  "personalization_notes": ["<note 1>", "<note 2>", "<note 3>"]
}`;

    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: analysisPrompt }],
        max_tokens: 800,
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!gptResponse.ok) {
      throw new Error("GPT analysis failed");
    }

    const gptData = await gptResponse.json();
    const result = JSON.parse(gptData.choices[0].message.content);

    if (!result.improved_prompt) {
      throw new Error("Invalid GPT response format");
    }

    // Append to improvements log
    const newLogEntry = {
      timestamp: new Date().toISOString(),
      changes_summary: result.changes_summary,
      personalization_notes: result.personalization_notes,
      message_count: recentMessages.length,
    };
    const updatedLog = [...improvementsLog, newLogEntry];

    // Upsert config
    if (config) {
      await serviceClient
        .from("ai_config")
        .update({
          system_prompt: result.improved_prompt,
          improvements_log: updatedLog,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else {
      await serviceClient
        .from("ai_config")
        .insert({
          user_id: userId,
          system_prompt: result.improved_prompt,
          improvements_log: updatedLog,
        });
    }

    return new Response(
      JSON.stringify({
        improved: true,
        message: result.changes_summary,
        personalization_notes: result.personalization_notes,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: "Self-improvement failed", details: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
