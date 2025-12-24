import { NextResponse } from "next/server";
import { claimNextJobs, finishJob } from "@/lib/jobs";
import { runJob } from "@/lib/jobsRunner";

export async function POST() {
  const jobs = await claimNextJobs(2);
  for (const job of jobs) {
    try {
      await runJob(job);
      await finishJob(job.id, true, null);
    } catch (e: any) {
      await finishJob(job.id, false, e?.message ?? "job failed");
    }
  }
  // Redirect back to referrer if available
  return NextResponse.redirect(new URL("/dashboard", process.env.APP_BASE_URL ?? "http://localhost:3000"));
}
