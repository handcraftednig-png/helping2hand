import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEFAULT_SYSTEM_PROMPT = `You are Helping Hand AI, a helpful AI assistant for students. You help with:
- Study tips and techniques
- Explaining academic concepts
- Time management and organization
- Homework and assignment help
- Test preparation strategies
- Wellness and stress management

Be encouraging, supportive, and provide practical advice. Keep responses concise but helpful.`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

async function fetchUserContext(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [
    { data: assignments },
    { data: exams },
    { data: goals },
    { data: workouts },
    { data: meals },
    { data: nutritionGoal },
    { data: fitnessProfile },
  ] = await Promise.all([
    serviceClient
      .from("assignments")
      .select("title,subject,due_date,priority,status,is_exam")
      .eq("user_id", userId)
      .eq("is_exam", false)
      .neq("status", "completed")
      .gte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(10),
    serviceClient
      .from("assignments")
      .select("title,subject,due_date,status")
      .eq("user_id", userId)
      .eq("is_exam", true)
      .neq("status", "completed")
      .gte("due_date", today)
      .lte("due_date", thirtyDaysOut)
      .order("due_date", { ascending: true })
      .limit(5),
    serviceClient
      .from("user_goals")
      .select("title,type,target_minutes,frequency")
      .eq("user_id", userId)
      .limit(10),
    serviceClient
      .from("workouts")
      .select("type,duration_minutes,date")
      .eq("user_id", userId)
      .gte("date", sevenDaysAgo)
      .order("date", { ascending: false })
      .limit(7),
    serviceClient
      .from("meals")
      .select("name,meal_type,calories,protein,carbs,fat,date")
      .eq("user_id", userId)
      .eq("date", today)
      .limit(10),
    serviceClient
      .from("nutrition_goals")
      .select("daily_calories,daily_protein,daily_carbs,daily_fat,goal")
      .eq("user_id", userId)
      .maybeSingle(),
    serviceClient
      .from("fitness_profile")
      .select("goal,fitness_level,weekly_target")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const lines: string[] = [
    "\n\n--- USER CONTEXT (use this to give personalized responses) ---",
  ];

  if (assignments && assignments.length > 0) {
    lines.push("\nUpcoming assignments:");
    for (const a of assignments) {
      const daysLeft = Math.ceil(
        (new Date(a.due_date).getTime() - Date.now()) / 86400000,
      );
      lines.push(
        `  • ${a.title} (${a.subject}) — due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}, priority: ${a.priority}`,
      );
    }
  }

  if (exams && exams.length > 0) {
    lines.push("\nUpcoming exams:");
    for (const e of exams) {
      const daysLeft = Math.ceil(
        (new Date(e.due_date).getTime() - Date.now()) / 86400000,
      );
      lines.push(
        `  • ${e.title} (${e.subject}) — in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
      );
    }
  }

  if (goals && goals.length > 0) {
    lines.push("\nPersonal goals:");
    for (const g of goals) {
      lines.push(
        `  • ${g.title} (${g.type}) — ${g.target_minutes}min ${g.frequency}`,
      );
    }
  }

  if (workouts && workouts.length > 0) {
    lines.push("\nRecent workouts (last 7 days):");
    for (const w of workouts) {
      lines.push(`  • ${w.date}: ${w.type} — ${w.duration_minutes}min`);
    }
  }

  if (fitnessProfile) {
    lines.push(
      `\nFitness profile: goal=${fitnessProfile.goal}, level=${fitnessProfile.fitness_level}, weekly target=${fitnessProfile.weekly_target} sessions`,
    );
  }

  if (meals && meals.length > 0) {
    const totalCal = meals.reduce((s, m) => s + (m.calories || 0), 0);
    lines.push(
      `\nToday's meals logged: ${meals.length} items, ~${totalCal} calories so far`,
    );
  }

  if (nutritionGoal) {
    lines.push(
      `Nutrition goal: ${nutritionGoal.goal} — target ${nutritionGoal.daily_calories} cal, P:${nutritionGoal.daily_protein}g C:${nutritionGoal.daily_carbs}g F:${nutritionGoal.daily_fat}g`,
    );
  }

  if (lines.length === 1) return ""; // No context found
  lines.push("--- END USER CONTEXT ---");
  return lines.join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages)) {
      return json({ error: "messages array required" }, 400);
    }
    const { messages } = body as { messages: ChatMessage[] };

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return json({ error: "OPENAI_API_KEY secret is not configured" }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve the caller from the JWT
    const token = (req.headers.get("Authorization") ?? "").replace(
      "Bearer ",
      "",
    );
    let userId: string | null = null;
    try {
      const { data } = await serviceClient.auth.getUser(token);
      userId = data.user?.id ?? null;
    } catch {
      // Non-fatal: we still serve the AI response without a userId
    }

    // Load personalised system prompt + user context in parallel
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    let userContext = "";

    await Promise.all([
      // Load custom system prompt
      userId
        ? serviceClient
            .from("ai_config")
            .select("system_prompt")
            .eq("user_id", userId)
            .maybeSingle()
            .then(({ data: config }) => {
              if (config?.system_prompt) systemPrompt = config.system_prompt;
            })
            .catch(() => {})
        : Promise.resolve(),

      // Fetch live user data for context injection
      userId
        ? fetchUserContext(serviceClient, userId)
            .then((ctx) => {
              userContext = ctx;
            })
            .catch(() => {})
        : Promise.resolve(),
    ]);

    const fullSystemPrompt = systemPrompt + userContext;

    // Persist the user message (best-effort)
    const latestUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (userId && latestUserMsg) {
      serviceClient
        .from("chat_messages")
        .insert({
          user_id: userId,
          role: "user",
          content: latestUserMsg.content,
        })
        .then(({ error }) => {
          if (error) console.error("chat_messages user insert:", error.message);
        });
    }

    // Call OpenAI
    const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: fullSystemPrompt }, ...messages],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!oaiRes.ok) {
      const oaiErr = await oaiRes.json().catch(() => ({ message: oaiRes.statusText }));
      const detail =
        oaiErr?.error?.message ?? oaiErr?.message ?? JSON.stringify(oaiErr);
      console.error("OpenAI error:", detail);
      return json({ error: `OpenAI error: ${detail}` }, 502);
    }

    const oaiData = await oaiRes.json();
    const assistantContent: string =
      oaiData.choices?.[0]?.message?.content ?? "I couldn't generate a response.";

    // Persist the assistant reply (best-effort)
    if (userId) {
      serviceClient
        .from("chat_messages")
        .insert({
          user_id: userId,
          role: "assistant",
          content: assistantContent,
        })
        .then(({ error }) => {
          if (error)
            console.error("chat_messages assistant insert:", error.message);
        });
    }

    return json({ message: assistantContent });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("openai-chat unhandled:", msg);
    return json({ error: `Internal error: ${msg}` }, 500);
  }
});
