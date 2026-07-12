import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openrouter/free";

async function callAI(system: string, user: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("AI is not configured");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": "https://campusxpose.com",
      "X-Title": "CampusXpose"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (res.status === 429) throw new Error("AI rate limit reached, try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI error ${res.status}: ${errText}`);
  }
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
  is_critical_sexual: boolean;
  requires_proof: boolean;
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

    // Fetch any evidence already attached to this post
    const { data: existingEvidence } = await supabaseAdmin
      .from("evidence")
      .select("id")
      .eq("post_id", post.id)
      .limit(1);
    const hasEvidence = (existingEvidence ?? []).length > 0;

    const system =
      "You analyze college complaint posts from Indian students. Return ONLY a JSON object with fields: " +
      "category (one of fake_fine, faculty, placement, hostel, harassment, sexual_violence, exam, general), " +
      "severity (1-5 where 5 = rape/sexual violence/crime, 4 = serious financial fraud, 3 = harassment/ragging, 1-2 = minor issues), " +
      "is_incident (boolean), " +
      "is_critical_sexual (boolean — true ONLY for rape, sexual assault, sexual exploitation, molestation, or any non-consensual sexual act), " +
      "requires_proof (boolean — true if the allegation is serious and specific enough that it should be withheld until the author provides evidence, e.g. naming individuals, accusing of crimes, financial fraud, sexual harassment, or any sexual violence), " +
      "extracted_amount (number INR or null), " +
      "extracted_date (string or null), " +
      "tags (array of 3-5 strings), " +
      "title (5-8 word summary), " +
      "ai_verdict (one sentence legal/ethical assessment). " +
      "IMPORTANT: Any mention of rape, sexual assault, molestation, balatkar, or sexual exploitation MUST have is_critical_sexual=true, severity=5, requires_proof=true, category=sexual_violence.";
    const raw = await callAI(system, `Post content: ${post.content}`);
    const analysis = safeJson<PostAnalysis>(raw, {
      category: post.category ?? "general",
      severity: 2,
      is_incident: false,
      is_critical_sexual: false,
      requires_proof: false,
      extracted_amount: null,
      extracted_date: null,
      tags: [],
      title: post.content.slice(0, 50),
      ai_verdict: "Unable to assess automatically.",
    });

    // Determine post status: hold if AI says proof is needed AND no evidence was given
    const newStatus = analysis.requires_proof && !hasEvidence ? "hold" : "published";

    await supabaseAdmin
      .from("posts")
      .update({
        category: analysis.category,
        is_incident: analysis.is_incident,
        ai_analyzed: true,
        status: newStatus,
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

// ─── Pre-submit review (runs synchronously before post is shown) ───────────────

interface PreReview {
  approved: boolean;
  needs_proof: boolean;
  is_critical_sexual: boolean;
  severity: number;
  severity_label: string;
  reason: string;
}

export const reviewBeforePublish = createServerFn({ method: "POST" })
  .inputValidator((d: { content: string; category: string }) =>
    z.object({
      content: z.string().min(5).max(5000),
      category: z.string().max(40),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<PreReview> => {
    const fallback = (isCritical: boolean): PreReview => ({
      approved: !isCritical,
      needs_proof: isCritical,
      is_critical_sexual: isCritical,
      severity: isCritical ? 5 : 2,
      severity_label: isCritical ? "CRITICAL" : "NORMAL",
      reason: isCritical
        ? "Yeh ek bahut serious allegation hai. Proof upload karna zaroori hai."
        : "Report normal lag rahi hai.",
    });

    // Keyword-based fast path (no AI needed for obvious cases)
    const lower = data.content.toLowerCase();
    const sexualKeywords = [
      "rape", "raping", "raped", "rapist",
      "sexual assault", "sexual harass", "sexually harass", "sexually assault",
      "molestation", "molest", "sexually abuse", "sexual abuse",
      "balatkar", "balatkaari",
    ];
    const keywordMatch = sexualKeywords.some((kw) => lower.includes(kw));
    const categoryMatch = data.category === "sexual_violence";

    try {
      const key = process.env.OPENROUTER_API_KEY;
      if (!key) return fallback(keywordMatch || categoryMatch);

      const system =
        "You are a content safety reviewer for an Indian college complaint platform. " +
        "Analyze the post and return ONLY JSON: { " +
        "is_critical_sexual: boolean (true if content involves rape, sexual assault, molestation, non-consensual sexual acts), " +
        "needs_proof: boolean (true if is_critical_sexual OR very serious personal accusations), " +
        "severity: number 1-5 (5=rape/sexual crime, 4=serious harassment, 3=ragging/bullying, 2=general complaint, 1=minor), " +
        "reason: string (short Hindi/English explanation to show user) }. " +
        "CRITICAL RULE: Any mention of rape, balatkar, sexual assault, molestation = is_critical_sexual MUST be true.";

      const raw = await callAI(system, `Category: ${data.category}\nContent: ${data.content}`);
      const parsed = safeJson<{ is_critical_sexual: boolean; needs_proof: boolean; severity: number; reason: string }>(raw, {
        is_critical_sexual: keywordMatch || categoryMatch,
        needs_proof: keywordMatch || categoryMatch,
        severity: keywordMatch || categoryMatch ? 5 : 2,
        reason: keywordMatch || categoryMatch
          ? "Yeh ek bahut serious allegation hai. Proof upload karna zaroori hai."
          : "Report normal lag rahi hai.",
      });

      const isCritical = parsed.is_critical_sexual || keywordMatch || categoryMatch;
      const severityLabel =
        parsed.severity >= 5 ? "CRITICAL" :
        parsed.severity >= 4 ? "SERIOUS" :
        parsed.severity >= 3 ? "MODERATE" : "NORMAL";

      return {
        approved: !isCritical,
        needs_proof: isCritical || parsed.needs_proof,
        is_critical_sexual: isCritical,
        severity: parsed.severity,
        severity_label: severityLabel,
        reason: parsed.reason,
      };
    } catch {
      // Fail safe: if AI errors, use keyword detection
      return fallback(keywordMatch || categoryMatch);
    }
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
