import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function enqueueJob(userId: string, type: string, payload: any) {
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .insert({ user_id: userId, type, payload, status: "queued", attempts: 0 })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function claimNextJobs(limit = 2) {
  // Simple "claim" by selecting queued and then updating status to running.
  // In production, you'd do this atomically (RPC). MVP keeps it simple.
  const { data: jobs, error } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  const claimed = [];
  for (const j of jobs ?? []) {
    const { data: updated } = await supabaseAdmin
      .from("jobs")
      .update({ status: "running", attempts: (j.attempts ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", j.id)
      .eq("status", "queued")
      .select("*")
      .maybeSingle();
    if (updated) claimed.push(updated);
  }
  return claimed;
}

export async function finishJob(jobId: string, ok: boolean, error?: string | null) {
  await supabaseAdmin
    .from("jobs")
    .update({ status: ok ? "succeeded" : "failed", error: error ?? null, updated_at: new Date().toISOString() })
    .eq("id", jobId);
}
