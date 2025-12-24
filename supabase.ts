import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { envPublic } from "@/lib/env.public";

export function supabaseBrowser() {
  return createBrowserClient(envPublic.NEXT_PUBLIC_SUPABASE_URL, envPublic.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient(envPublic.NEXT_PUBLIC_SUPABASE_URL, envPublic.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components can't set cookies; this will be handled in middleware.
        }
      }
    }
  });
}
