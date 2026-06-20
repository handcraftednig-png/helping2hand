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

You can also take actions directly on the student's behalf using the tools
available to you: creating assignments/exams, logging meals and workouts,
creating recurring goals, and adding calendar blocks. When the student asks
you to do one of these things (e.g. "add an exam for Friday", "log that I had
eggs for breakfast", "create a workout goal"), call the matching tool instead
of just describing what they should do. Confirm what you did afterward in
plain language. If you're missing required details, ask a brief clarifying
question instead of guessing.

Be encouraging, supportive, and provide practical advice. Keep responses concise but helpful.`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_assignment",
      description: "Create a new assignment or exam for the student, with a due date.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          subject: { type: "string" },
          due_date: { type: "string", description: "YYYY-MM-DD" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          is_exam: { type: "boolean", description: "true if this is an exam rather than a regular assignment" },
        },
        required: ["title", "subject", "due_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_meal",
      description: "Log a meal the student ate, with nutrition info.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
          calories: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fat: { type: "number" },
          date: { type: "string", description: "YYYY-MM-DD, defaults to today if omitted" },
        },
        required: ["name", "meal_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_workout",
      description: "Log a workout the student completed.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string" },
          duration_minutes: { type: "number" },
          calories_burned: { type: "number" },
          date: { type: "string", description: "YYYY-MM-DD, defaults to today if omitted" },
          notes: { type: "string" },
        },
        required: ["type", "duration_minutes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_goal",
      description: "Create a new recurring personal goal (study, workout, reading, sleep, other) for the student.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          type: { type: "string", enum: ["study", "workout", "reading", "sleep", "other"] },
          target_minutes: { type: "number" },
          frequency: { type: "string", enum: ["daily", "weekdays", "weekends", "weekly"] },
          preferred_time: { type: "string", description: "HH:MM 24-hour, optional" },
        },
        required: ["title", "type", "target_minutes", "frequency"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_schedule_block",
      description: "Add a one-off block to the student's calendar/schedule for a specific date and time.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          type: { type: "string", enum: ["study", "workout", "reminder", "class", "reading", "sleep", "other"] },
          date: { type: "string", description: "YYYY-MM-DD" },
          start_time: { type: "string", description: "HH:MM 24-hour, optional" },
          duration_minutes: { type: "number" },
        },
        required: ["title", "date"],
      },
    },
  },
];

async function executeTool(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const today = new Date().toISOString().split("T")[0];
  switch (name) {
    case "create_assignment": {
      const { data, error } = await serviceClient.from("assignments").insert({
        user_id: userId,
        title: args.title,
        subject: args.subject,
        due_date: args.due_date,
        priority: args.priority || "medium",
        is_exam: !!args.is_exam,
        status: "pending",
      }).select().single();
      return error ? { error: error.message } : { success: true, assignment: data };
    }
    case "log_meal": {
      const { data, error } = await serviceClient.from("meals").insert({
        user_id: userId,
        name: args.name,
        meal_type: args.meal_type,
        calories: args.calories ?? null,
        protein: args.protein ?? null,
        carbs: args.carbs ?? null,
        fat: args.fat ?? null,
        date: args.date || today,
      }).select().single();
      return error ? { error: error.message } : { success: true, meal: data };
    }
    case "log_workout": {
      const { data, error } = await serviceClient.from("workouts").insert({
        user_id: userId,
        type: args.type,
        duration_minutes: args.duration_minutes,
        calories_burned: args.calories_burned ?? null,
        date: args.date || today,
        notes: args.notes ?? null,
      }).select().single();
      return error ? { error: error.message } : { success: true, workout: data };
    }
    case "create_goal": {
      const { data, error } = await serviceClient.from("user_goals").insert({
        user_id: userId,
        title: args.title,
        type: args.type,
        target_minutes: args.target_minutes,
        frequency: args.frequency,
        preferred_time: args.preferred_time ?? null,
      }).select().single();
      return error ? { error: error.message } : { success: true, goal: data };
    }
    case "create_schedule_block": {
      const { data, error } = await serviceClient.from("schedule_blocks").insert({
        user_id: userId,
        title: args.title,
        type: args.type || "other",
        date: args.date,
        start_time: args.start_time ?? null,
        duration_minutes: args.duration_minutes ?? 60,
        completed: false,
        auto_generated: false,
      }).select().single();
      return error ? { error: error.message } : { success: true, block: data };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
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
    const { messages, session_id } = body as { messages: ChatMessage[]; session_id?: string };
    const sessionId = session_id || "main";

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

    // Persist the user message (best-effort, but awaited so it's committed
    // before the response returns and the client reloads chat history)
    const latestUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (userId && latestUserMsg) {
      const { error } = await serviceClient.from("chat_messages").insert({
        user_id: userId,
        session_id: sessionId,
        role: "user",
        content: latestUserMsg.content,
      });
      if (error) console.error("chat_messages user insert:", error.message);
    }

    // Call OpenAI, looping to let it use tools (create assignments, log meals,
    // log workouts, create goals, add schedule blocks) before producing a
    // final natural-language reply.
    // deno-lint-ignore no-explicit-any
    const workingMessages: any[] = [
      { role: "system", content: fullSystemPrompt },
      ...messages,
    ];
    let assistantContent = "I couldn't generate a response.";
    const MAX_TOOL_ROUNDS = 3;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: workingMessages,
          ...(userId ? { tools: TOOLS, tool_choice: "auto" } : {}),
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
      const msg = oaiData.choices?.[0]?.message;
      if (!msg) break;

      if (msg.tool_calls?.length && round < MAX_TOOL_ROUNDS && userId) {
        workingMessages.push(msg);
        for (const tc of msg.tool_calls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments || "{}");
          } catch {
            // malformed args — executeTool's default case will surface this
          }
          const result = await executeTool(serviceClient, userId, tc.function.name, args);
          workingMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      assistantContent = msg.content ?? assistantContent;
      break;
    }

    // Persist the assistant reply (best-effort, but awaited — see above)
    if (userId) {
      const { error } = await serviceClient.from("chat_messages").insert({
        user_id: userId,
        session_id: sessionId,
        role: "assistant",
        content: assistantContent,
      });
      if (error) console.error("chat_messages assistant insert:", error.message);
    }

    return json({ message: assistantContent });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("openai-chat unhandled:", msg);
    return json({ error: `Internal error: ${msg}` }, 500);
  }
});
