import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST() {
  const sb = supabaseServer();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/login", process.env.APP_BASE_URL ?? "http://localhost:3000"));
}
