import { Container } from "@/components/ui";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { Button } from "@/components/ui";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sb = supabaseServer();
  const { data } = await sb.auth.getUser();

  return (
    <div>
      <header className="border-b border-zinc-200 bg-white">
        <Container className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="font-semibold">Ebook Factory</Link>
            <span className="text-xs text-zinc-500">MVP</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/new"><Button variant="secondary">+ Novo ebook</Button></Link>
            <form action="/api/auth/signout" method="post">
              <Button variant="ghost" type="submit">Sair</Button>
            </form>
            <span className="text-xs text-zinc-500">{data.user?.email}</span>
          </div>
        </Container>
      </header>
      <main>
        <Container className="py-6">{children}</Container>
      </main>
    </div>
  );
}
