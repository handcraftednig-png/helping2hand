import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ClassroomCourse {
  id: string;
  name: string;
  courseState: string;
}

interface ClassroomCourseWork {
  id: string;
  title: string;
  description?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number };
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return res.json();
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

    const { data: connection, error: connError } = await serviceClient
      .from("classroom_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (connError || !connection) {
      return json({ error: "Google Classroom is not connected" }, 400);
    }

    let accessToken = connection.access_token as string;
    const expiresAt = new Date(connection.expires_at as string).getTime();

    if (Date.now() >= expiresAt - 60_000) {
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
      if (!clientId || !clientSecret) {
        return json({ error: "GOOGLE_CLIENT_ID/SECRET not configured on the server" }, 500);
      }
      const refreshed = await refreshAccessToken(connection.refresh_token as string, clientId, clientSecret);
      if (!refreshed) {
        return json({ error: "Could not refresh Google access token. Please reconnect Google Classroom." }, 401);
      }
      accessToken = refreshed.access_token;
      await serviceClient
        .from("classroom_connections")
        .update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq("user_id", userId);
    }

    const gFetch = (url: string) =>
      fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

    const coursesRes = await gFetch(
      "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=50",
    );
    if (!coursesRes.ok) {
      const errBody = await coursesRes.json().catch(() => ({}));
      return json({ error: `Classroom courses fetch failed: ${errBody?.error?.message ?? coursesRes.statusText}` }, 502);
    }
    const coursesData = await coursesRes.json();
    const courses: ClassroomCourse[] = coursesData.courses ?? [];

    let syncedAssignments = 0;
    const upsertRows: Record<string, unknown>[] = [];

    for (const course of courses) {
      const workRes = await gFetch(
        `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?pageSize=100`,
      );
      if (!workRes.ok) continue;
      const workData = await workRes.json();
      const courseWork: ClassroomCourseWork[] = workData.courseWork ?? [];

      for (const item of courseWork) {
        if (!item.dueDate) continue;
        const dueDate = `${item.dueDate.year}-${String(item.dueDate.month).padStart(2, "0")}-${String(item.dueDate.day).padStart(2, "0")}`;
        upsertRows.push({
          user_id: userId,
          title: item.title,
          description: item.description ?? null,
          subject: course.name,
          due_date: dueDate,
          external_source: "google_classroom",
          external_id: item.id,
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
      .from("classroom_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", userId);

    return json({
      synced_courses: courses.length,
      synced_assignments: syncedAssignments,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("classroom-sync unhandled:", msg);
    return json({ error: `Internal error: ${msg}` }, 500);
  }
});
