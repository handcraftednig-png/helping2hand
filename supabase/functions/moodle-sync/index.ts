import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MoodleCourse {
  id: number;
  fullname: string;
}

interface MoodleAssignment {
  id: number;
  name: string;
  intro?: string;
  duedate: number;
}

function normalizeBaseUrl(raw: string): string {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

async function callMoodle(baseUrl: string, token: string, wsfunction: string, params: Record<string, string> = {}) {
  const url = new URL(`${baseUrl}/webservice/rest/server.php`);
  url.searchParams.set("wstoken", token);
  url.searchParams.set("wsfunction", wsfunction);
  url.searchParams.set("moodlewsrestformat", "json");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Moodle request failed: ${res.statusText}`);
  const data = await res.json();
  if (data && typeof data === "object" && "exception" in data) {
    throw new Error(data.message ?? "Moodle rejected the request");
  }
  return data;
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

    const authHeader = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: authData, error: authError } = await serviceClient.auth.getUser(authHeader);
    if (authError || !authData.user) {
      return json({ error: "Not authenticated" }, 401);
    }
    const userId = authData.user.id;

    const body = await req.json().catch(() => ({}));
    const incomingBaseUrl = typeof body.base_url === "string" ? body.base_url.trim() : "";
    const incomingAccessToken = typeof body.access_token === "string" ? body.access_token.trim() : "";

    let baseUrl: string;
    let accessToken: string;
    let moodleUserId: string;

    if (incomingBaseUrl && incomingAccessToken) {
      baseUrl = normalizeBaseUrl(incomingBaseUrl);
      accessToken = incomingAccessToken;

      let siteInfo: { userid: number };
      try {
        siteInfo = await callMoodle(baseUrl, accessToken, "core_webservice_get_site_info");
      } catch {
        return json({ error: "Could not verify that Moodle URL and token. Double-check both and try again." }, 400);
      }
      moodleUserId = String(siteInfo.userid);

      const { error: upsertErr } = await serviceClient
        .from("moodle_connections")
        .upsert(
          {
            user_id: userId,
            base_url: baseUrl,
            access_token: accessToken,
            moodle_user_id: moodleUserId,
            connected_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      if (upsertErr) {
        return json({ error: `Failed saving Moodle connection: ${upsertErr.message}` }, 500);
      }
    } else {
      const { data: connection, error: connError } = await serviceClient
        .from("moodle_connections")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (connError || !connection) {
        return json({ error: "Moodle is not connected" }, 400);
      }
      baseUrl = connection.base_url as string;
      accessToken = connection.access_token as string;
      moodleUserId = connection.moodle_user_id as string;
    }

    const courses: MoodleCourse[] = await callMoodle(baseUrl, accessToken, "core_enrol_get_users_courses", {
      userid: moodleUserId,
    });

    let syncedAssignments = 0;
    const upsertRows: Record<string, unknown>[] = [];

    for (const course of courses) {
      let assignData: { courses: { assignments: MoodleAssignment[] }[] };
      try {
        assignData = await callMoodle(baseUrl, accessToken, "mod_assign_get_assignments", {
          "courseids[0]": String(course.id),
        });
      } catch {
        continue;
      }

      const assignments = assignData.courses?.[0]?.assignments ?? [];
      for (const item of assignments) {
        if (!item.duedate) continue;
        const dueDate = new Date(item.duedate * 1000).toISOString().slice(0, 10);
        upsertRows.push({
          user_id: userId,
          title: item.name,
          description: item.intro ?? null,
          subject: course.fullname,
          due_date: dueDate,
          external_source: "moodle",
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
      .from("moodle_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", userId);

    return json({
      synced_courses: courses.length,
      synced_assignments: syncedAssignments,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("moodle-sync unhandled:", msg);
    return json({ error: `Internal error: ${msg}` }, 500);
  }
});
