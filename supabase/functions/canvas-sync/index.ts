import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CanvasCourse {
  id: number;
  name: string;
}

interface CanvasAssignment {
  id: number;
  name: string;
  description?: string | null;
  due_at?: string | null;
}

function normalizeBaseUrl(raw: string): string {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: authData, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !authData.user) {
      return json({ error: "Not authenticated" }, 401);
    }
    const userId = authData.user.id;

    const body = await req.json().catch(() => ({}));
    const incomingBaseUrl = typeof body.base_url === "string" ? body.base_url.trim() : "";
    const incomingAccessToken = typeof body.access_token === "string" ? body.access_token.trim() : "";

    let baseUrl: string;
    let accessToken: string;

    if (incomingBaseUrl && incomingAccessToken) {
      baseUrl = normalizeBaseUrl(incomingBaseUrl);
      accessToken = incomingAccessToken;

      const verifyRes = await fetch(`${baseUrl}/api/v1/users/self`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!verifyRes.ok) {
        return json({ error: "Could not verify that Canvas URL and access token. Double-check both and try again." }, 400);
      }

      const { error: upsertErr } = await serviceClient
        .from("canvas_connections")
        .upsert(
          { user_id: userId, base_url: baseUrl, access_token: accessToken, connected_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      if (upsertErr) {
        return json({ error: `Failed saving Canvas connection: ${upsertErr.message}` }, 500);
      }
    } else {
      const { data: connection, error: connError } = await serviceClient
        .from("canvas_connections")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (connError || !connection) {
        return json({ error: "Canvas is not connected" }, 400);
      }
      baseUrl = connection.base_url as string;
      accessToken = connection.access_token as string;
    }

    const cFetch = (path: string) =>
      fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });

    const coursesRes = await cFetch("/api/v1/courses?enrollment_state=active&per_page=100");
    if (!coursesRes.ok) {
      return json({ error: `Canvas courses fetch failed: ${coursesRes.statusText}` }, 502);
    }
    const courses: CanvasCourse[] = await coursesRes.json();

    let syncedAssignments = 0;
    const upsertRows: Record<string, unknown>[] = [];

    for (const course of courses) {
      const assignmentsRes = await cFetch(`/api/v1/courses/${course.id}/assignments?per_page=100`);
      if (!assignmentsRes.ok) continue;
      const assignments: CanvasAssignment[] = await assignmentsRes.json();

      for (const item of assignments) {
        if (!item.due_at) continue;
        upsertRows.push({
          user_id: userId,
          title: item.name,
          description: item.description ?? null,
          subject: course.name,
          due_date: item.due_at.slice(0, 10),
          external_source: "canvas",
          external_id: String(item.id),
        });
        syncedAssignments++;
      }
    }

    if (upsertRows.length > 0) {
      const { error: upsertErr } = await serviceClient
        .from("assignments")
        .upsert(upsertRows, { onConflict: "user_id,external_source,external_id" });
      if (upsertErr) {
        return json({ error: `Failed saving assignments: ${upsertErr.message}` }, 500);
      }
    }

    await serviceClient
      .from("canvas_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", userId);

    return json({
      synced_courses: courses.length,
      synced_assignments: syncedAssignments,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("canvas-sync unhandled:", msg);
    return json({ error: `Internal error: ${msg}` }, 500);
  }
});
