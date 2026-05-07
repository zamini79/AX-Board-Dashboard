import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Get user profile & org
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, org_id")
      .eq("id", userId)
      .single();

    if (!profile?.org_id) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.org_id;
    const userName = profile.full_name || "사용자";

    // Fetch org data in parallel
    const [kpisRes, tasksRes, budgetsRes, deptsRes, goalsRes, initsRes] = await Promise.all([
      supabase.from("kpis").select("name, status, current_value, target_value, unit, department_id").eq("org_id", orgId).is("archived_at", null),
      supabase.from("tasks").select("title, status, priority, due_date, progress_percent, type, owner_name").eq("org_id", orgId),
      supabase.from("budgets").select("category, department, budget_amount, actual_amount, forecast_amount, budget_type, year").eq("org_id", orgId),
      supabase.from("departments").select("id, name, parent_id").eq("org_id", orgId),
      supabase.from("performance_goals").select("title, status, overall_score, owner_name, parent_id, perspective, target_date").eq("org_id", orgId),
      supabase.from("initiatives").select("title, status, score, weight, target_value, current_value, unit, owner_name, goal_id, dashboard_url").eq("org_id", orgId),
    ]);

    const kpis = kpisRes.data || [];
    const tasks = tasksRes.data || [];
    const budgets = budgetsRes.data || [];
    const depts = deptsRes.data || [];
    const goals = goalsRes.data || [];
    const inits = initsRes.data || [];

    // Build context summary
    const kpiSummary = buildKpiSummary(kpis);
    const taskSummary = buildTaskSummary(tasks);
    const budgetSummary = buildBudgetSummary(budgets);
    const perfSummary = buildPerformanceSummary(goals, inits);

    const today = new Date().toISOString().split("T")[0];

    const systemPrompt = `당신은 "${userName}" 대표님의 전략 참모(Chief of Staff)입니다.
오늘 날짜: ${today}

## 역할
- 조직의 KPI, 과제, 예산 데이터를 기반으로 사실에 근거한 분석을 제공합니다
- 위험 요소를 선제적으로 알리고, 구체적이고 실행 가능한 제안을 합니다
- 한국어로 간결하고 명확하게 답변합니다
- 데이터에 없는 내용은 추측하지 않습니다

## 현재 조직 데이터

### KPI 현황
${kpiSummary}

### 과제 현황
${taskSummary}

### 예산 현황
${budgetSummary}

### 성과 관리 현황
${perfSummary}

### 부서 구조
${depts.map((d) => d.name).join(", ") || "등록된 부서 없음"}

## 응답 지침
- 숫자와 데이터를 적극 인용하세요
- 위험/경고 사항은 ⚠️ 이모지로 강조하세요
- 핵심 인사이트는 **볼드**로 표시하세요
- 제안사항은 번호를 매겨 정리하세요
- 너무 길지 않게, 핵심 위주로 답변하세요`;

    const { messages } = await req.json();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 크레딧이 부족합니다." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI 서비스 오류가 발생했습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildKpiSummary(kpis: any[]): string {
  if (!kpis.length) return "등록된 KPI 없음";
  const statusCount: Record<string, number> = {};
  kpis.forEach((k) => {
    const s = k.status || "na";
    statusCount[s] = (statusCount[s] || 0) + 1;
  });
  const statusLabels: Record<string, string> = { on_track: "정상", at_risk: "주의", off_track: "위험", na: "미설정" };
  let summary = `총 ${kpis.length}건\n`;
  summary += Object.entries(statusCount).map(([s, c]) => `- ${statusLabels[s] || s}: ${c}건`).join("\n");
  summary += "\n\n상세:\n";
  summary += kpis.map((k) => {
    const progress = k.target_value ? `${k.current_value ?? 0}/${k.target_value}${k.unit || ""}` : "목표 미설정";
    return `- ${k.name}: ${statusLabels[k.status] || k.status} (${progress})`;
  }).join("\n");
  return summary;
}

function buildTaskSummary(tasks: any[]): string {
  if (!tasks.length) return "등록된 과제 없음";
  const statusCount: Record<string, number> = {};
  const today = new Date().toISOString().split("T")[0];
  let overdueCount = 0;
  tasks.forEach((t) => {
    const s = t.status || "not_started";
    statusCount[s] = (statusCount[s] || 0) + 1;
    if (t.due_date && t.due_date < today && !["done", "closed", "cancelled"].includes(s)) overdueCount++;
  });
  const statusLabels: Record<string, string> = {
    not_started: "미시작", in_progress: "진행중", blocked: "차단", done: "완료",
    executive_review: "임원검토", closed: "종료", cancelled: "취소",
  };
  let summary = `총 ${tasks.length}건 (기한 초과: ${overdueCount}건)\n`;
  summary += Object.entries(statusCount).map(([s, c]) => `- ${statusLabels[s] || s}: ${c}건`).join("\n");
  if (overdueCount > 0) {
    summary += "\n\n⚠️ 기한 초과 과제:\n";
    summary += tasks
      .filter((t) => t.due_date && t.due_date < today && !["done", "closed", "cancelled"].includes(t.status))
      .map((t) => `- ${t.title} (마감: ${t.due_date}, 담당: ${t.owner_name || "미지정"})`)
      .join("\n");
  }
  return summary;
}

function buildBudgetSummary(budgets: any[]): string {
  if (!budgets.length) return "등록된 예산 없음";
  let totalBudget = 0, totalActual = 0;
  budgets.forEach((b) => {
    totalBudget += Number(b.budget_amount) || 0;
    totalActual += Number(b.actual_amount) || 0;
  });
  const execRate = totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : "0";
  let summary = `총 예산: ${(totalBudget / 1e6).toFixed(0)}백만원, 집행: ${(totalActual / 1e6).toFixed(0)}백만원 (집행률: ${execRate}%)\n`;
  summary += budgets.map((b) => {
    const rate = b.budget_amount > 0 ? ((Number(b.actual_amount) / Number(b.budget_amount)) * 100).toFixed(1) : "0";
    return `- ${b.category || b.department || "미분류"}: 예산 ${(Number(b.budget_amount) / 1e6).toFixed(0)}백만 / 집행 ${(Number(b.actual_amount) / 1e6).toFixed(0)}백만 (${rate}%)`;
  }).join("\n");
  return summary;
}

function buildPerformanceSummary(goals: any[], initiatives: any[]): string {
  if (!goals.length) return "등록된 성과 목표 없음";

  const statusLabels: Record<string, string> = { not_started: "미시작", active: "진행중", completed: "완료", on_hold: "보류" };
  const statusCount: Record<string, number> = {};
  goals.forEach((g) => { const s = g.status || "not_started"; statusCount[s] = (statusCount[s] || 0) + 1; });

  const topGoals = goals.filter((g) => !g.parent_id);
  const avgScore = goals.length > 0
    ? (goals.reduce((sum: number, g: any) => sum + (Number(g.overall_score) || 0), 0) / goals.length).toFixed(1)
    : "0";

  let summary = `총 ${goals.length}건 (최상위: ${topGoals.length}건), 평균 달성률: ${avgScore}점\n`;
  summary += Object.entries(statusCount).map(([s, c]) => `- ${statusLabels[s] || s}: ${c}건`).join("\n");

  if (topGoals.length > 0) {
    summary += "\n\n최상위 성과 목표:\n";
    summary += topGoals.map((g) => {
      const score = Number(g.overall_score) || 0;
      const childInits = initiatives.filter((i: any) => i.goal_id === g.title); // use goal matching
      return `- ${g.title}: ${statusLabels[g.status] || g.status} (${score.toFixed(1)}점, 담당: ${g.owner_name || "미지정"})`;
    }).join("\n");
  }

  // Initiative summary
  if (initiatives.length > 0) {
    const initStatusLabels: Record<string, string> = { not_started: "미시작", in_progress: "진행중", completed: "완료", blocked: "차단" };
    const initStatusCount: Record<string, number> = {};
    initiatives.forEach((i: any) => { const s = i.status || "not_started"; initStatusCount[s] = (initStatusCount[s] || 0) + 1; });
    const blockedInits = initiatives.filter((i: any) => i.status === "blocked");

    summary += `\n\n이니셔티브: 총 ${initiatives.length}건\n`;
    summary += Object.entries(initStatusCount).map(([s, c]) => `- ${initStatusLabels[s] || s}: ${c}건`).join("\n");

    if (blockedInits.length > 0) {
      summary += "\n\n⚠️ 차단된 이니셔티브:\n";
      summary += blockedInits.map((i: any) => `- ${i.title} (담당: ${i.owner_name || "미지정"})`).join("\n");
    }
  }

  return summary;
}
