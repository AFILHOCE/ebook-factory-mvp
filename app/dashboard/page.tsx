import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { Card, CardBody, CardHeader, H1, H2, Pill, Notice, Button, Separator } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function DashboardPage() {
  const sb = supabaseServer();
  const { data: userRes } = await sb.auth.getUser();
  const user = userRes.user!;
  const { data: books } = await sb.from("books").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  const { data: sub } = await sb.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();

  const remaining = sub?.ebooks_remaining_in_period ?? 0;
  const status = sub?.status ?? "inactive";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <H1>Seu painel</H1>
          <p className="text-sm text-zinc-600">Crie ebooks com estrutura + escrita + revisão automática (capítulo a capítulo).</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <Notice tone={status === "active" ? "ok" : "warn"}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <b>Plano:</b> {status === "active" ? "Ativo" : "Inativo"} • <b>Ebooks restantes no ciclo:</b> {remaining}
                <div className="text-xs text-zinc-600 mt-1">
                  Dica: o MVP usa “1 ebook por ciclo” para manter custo baixo e qualidade alta.
                </div>
              </div>
              <Link href="/dashboard/new"><Button>Gerar ebook</Button></Link>
            </div>
          </Notice>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <H2>Seus ebooks</H2>
            <Link href="/dashboard/new"><Button variant="secondary">+ Novo</Button></Link>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {!books?.length ? (
            <div className="text-sm text-zinc-600">Nenhum ebook ainda. Crie o primeiro e use como vitrine.</div>
          ) : (
            <div className="space-y-2">
              {books.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3">
                  <div className="min-w-0">
                    <Link href={`/dashboard/books/${b.id}`} className="font-medium hover:underline">
                      {b.title ?? "Sem título (ainda)"}{" "}
                      <span className="text-sm text-zinc-500">{b.subtitle ? `— ${b.subtitle}` : ""}</span>
                    </Link>
                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                      <Pill>{b.language.toUpperCase()}</Pill>
                      <Pill>{b.status}</Pill>
                      <span>criado {formatDistanceToNow(new Date(b.created_at), { addSuffix: true, locale: ptBR })}</span>
                    </div>
                  </div>
                  <Link href={`/dashboard/books/${b.id}`}><Button variant="secondary">Abrir</Button></Link>
                </div>
              ))}
            </div>
          )}
          <Separator />
          <div className="text-xs text-zinc-500">
            A qualidade vem do fluxo: blueprint → capítulo → revisão. Um clique só dá “texto longo”; aqui dá livro publicável.
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
