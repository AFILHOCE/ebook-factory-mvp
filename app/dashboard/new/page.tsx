"use client";

import { useState } from "react";
import { z } from "zod";
import { Button, Card, CardBody, CardHeader, Container, H1, Input, Label, Notice, Textarea } from "@/components/ui";

const schema = z.object({
  language: z.enum(["pt", "en"]),
  niche: z.string().min(2),
  targetAudience: z.string().min(3),
  tone: z.string().min(2),
  promise: z.string().min(10),
  constraints: z.string().optional(),
  sources: z.string().optional()
});

type Form = z.infer<typeof schema>;

export default function NewBookPage() {
  const [form, setForm] = useState<Form>({
    language: "pt",
    niche: "finanças pessoais",
    targetAudience: "iniciante que quer aprender e aplicar",
    tone: "claro, direto e prático",
    promise: "Ajudar o leitor a sair do zero e criar um plano de ação simples para melhorar sua vida financeira em 30 dias.",
    constraints: "Evitar promessas irreais; sem números inventados.",
    sources: ""
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function create() {
    setMsg(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setMsg(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erro ao criar ebook.");
      // start outline job automatically
      await fetch(`/api/books/${data.book_id}/outline`, { method: "POST" });
      window.location.href = `/dashboard/books/${data.book_id}`;
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container className="py-2">
      <Card>
        <CardHeader>
          <H1>Novo ebook</H1>
          <p className="text-sm text-zinc-600">
            Você preenche o briefing. A IA faz o resto em etapas (blueprint → capítulos → revisão).
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          {msg ? <Notice tone="warn">{msg}</Notice> : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Idioma</Label>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-300"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value as any })}
              >
                <option value="pt">Português</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <Label>Nicho</Label>
              <Input value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Público-alvo</Label>
              <Input value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Tom/estilo</Label>
              <Input value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Promessa do livro (o que o leitor ganha)</Label>
              <Textarea rows={4} value={form.promise} onChange={(e) => setForm({ ...form, promise: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Restrições (opcional)</Label>
              <Textarea rows={3} value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Materiais do usuário (opcional)</Label>
              <Textarea rows={4} placeholder="Bullets, exemplos, suas experiências, referências..." value={form.sources} onChange={(e) => setForm({ ...form, sources: e.target.value })} />
            </div>
          </div>

          <Notice tone="info">
            <b>Como garantimos qualidade:</b> o sistema primeiro cria um blueprint editorial, depois escreve capítulo a capítulo
            e passa por uma revisão automática que corta repetição e “texto vazio”.
          </Notice>

          <Button disabled={busy} onClick={create}>
            {busy ? "Criando..." : "Criar ebook e gerar blueprint"}
          </Button>
        </CardBody>
      </Card>
    </Container>
  );
}
