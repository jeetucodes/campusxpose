import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callAI(system: string, user: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("AI rate limit reached, try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "{}";
}

function safeJson<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

interface PostAnalysis {
  category: string;
  severity: number;
  is_incident: boolean;
  extracted_amount: number | null;
  extracted_date: string | null;
  tags: string[];
  title: string;
  ai_verdict: string;
}

export const analyzePost = createServerFn({ method: "POST" })
  .inputValidator((d: { postId: string }) =>
    z.object({ postId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: post } = await supabaseAdmin
      .from("posts")
      .select("*")
      .eq("id", data.postId)
      .maybeSingle();
    if (!post) throw new Error("Post not found");

    const system =
      "You analyze college complaint posts from Indian students. Return ONLY a JSON object with fields: category (one of fake_fine, faculty, placement, hostel, harassment, exam, general), severity (1-5), is_incident (boolean), extracted_amount (number INR or null), extracted_date (string or null), tags (array of 3-5 strings), title (5-8 word summary), ai_verdict (one sentence legal/ethical assessment).";
    const raw = await callAI(system, `Post content: ${post.content}`);
    const analysis = safeJson<PostAnalysis>(raw, {
      category: post.category ?? "general",
      severity: 2,
      is_incident: false,
      extracted_amount: null,
      extracted_date: null,
      tags: [],
      title: post.content.slice(0, 50),
      ai_verdict: "Unable to assess automatically.",
    });

    await supabaseAdmin
      .from("posts")
      .update({
        category: analysis.category,
        is_incident: analysis.is_incident,
        ai_analyzed: true,
      })
      .eq("id", post.id);

    let incidentId: string | null = post.incident_id;
    if (analysis.is_incident) {
      const cutoff = new Date(Date.now() - 30 * 864e5).toISOString();
      const { data: existing } = await supabaseAdmin
        .from("incidents")
        .select("id, affected_count")
        .eq("college_id", post.college_id)
        .eq("category", analysis.category)
        .gte("first_seen", cutoff)
        .order("first_seen", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        incidentId = existing.id;
        await supabaseAdmin
          .from("incidents")
          .update({
            affected_count: (existing.affected_count ?? 1) + 1,
            last_updated: new Date().toISOString(),
            trend: "rising",
          })
          .eq("id", existing.id);
      } else {
        const { data: created } = await supabaseAdmin
          .from("incidents")
          .insert({
            college_id: post.college_id,
            category: analysis.category,
            title: analysis.title,
            description: post.content,
            severity: analysis.severity,
            total_amount: analysis.extracted_amount ?? 0,
            ai_verdict: analysis.ai_verdict,
            ai_summary: post.content,
          })
          .select("id")
          .maybeSingle();
        incidentId = created?.id ?? null;
      }
      if (incidentId) {
        await supabaseAdmin
          .from("posts")
          .update({ incident_id: incidentId })
          .eq("id", post.id);
      }
    }

    return { analysis, incidentId };
  });

interface ChatSummary {
  key_issues: string[];
  sentiment: string;
  incident_count: number;
  main_category: string;
}

export const chatSummary = createServerFn({ method: "POST" })
  .inputValidator((d: { collegeId: string }) =>
    z.object({ collegeId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }): Promise<ChatSummary> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: msgs } = await supabaseAdmin
      .from("community_messages")
      .select("content")
      .eq("college_id", data.collegeId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!msgs || msgs.length === 0) {
      return { key_issues: [], sentiment: "neutral", incident_count: 0, main_category: "general" };
    }
    const system =
      "Summarize the main issues discussed in this college community chat. Return ONLY JSON: { key_issues: array of 3-5 short bullet strings, sentiment: one of positive/negative/neutral/mixed, incident_count: number, main_category: string }.";
    const raw = await callAI(system, msgs.map((m) => m.content).join("\n"));
    return safeJson<ChatSummary>(raw, {
      key_issues: [],
      sentiment: "neutral",
      incident_count: 0,
      main_category: "general",
    });
  });
