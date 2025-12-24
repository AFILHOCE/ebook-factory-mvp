# Ebook Factory MVP (Next.js + Supabase + OpenAI)

Este projeto entrega um MVP “fábrica de ebooks” com foco em **simplicidade** e **qualidade editorial**:
- fluxo em etapas: **blueprint → capítulo → revisão → exportação**
- evita “texto inflado” (o clássico problema de gerar tudo em 1 clique)
- controle de escala: **1 ebook por ciclo** (barato de vender e barato de operar)

## 0) Pré-requisitos
- Node.js 18+
- Uma conta no Supabase
- Uma chave de API da OpenAI (SDK oficial usa `openai` e endpoint **Responses**)  
  Referência: docs do SDK e Responses API.

## 1) Configurar Supabase (10 min)
1. Crie um projeto no Supabase.
2. No painel, crie um bucket no Storage chamado `exports` (public = OFF).
3. No SQL Editor, rode o arquivo:
   - `supabase/schema.sql`
4. Em Authentication:
   - habilite Email/Password
   - (opcional) disable email confirmations para testes

## 2) Variáveis de ambiente
Crie `.env.local` com base em `.env.example`.

## 3) Rodar local
```bash
npm install
npm run dev
```
Abra: http://localhost:3000

## 4) Como usar o MVP
1. Faça login/crie conta.
2. Se sua assinatura estiver “inativa”, o MVP bloqueia criação de ebook.
   - Para teste rápido, no Supabase SQL Editor rode:
     ```sql
     insert into public.subscriptions(user_id,status,plan,ebooks_remaining_in_period)
     values ('SEU_USER_UUID','active','basic',1)
     on conflict (user_id) do update set status='active', ebooks_remaining_in_period=1;
     ```
3. Clique “Novo ebook”, preencha briefing e gere o blueprint.
4. Clique “Processar jobs” para rodar o worker (MVP).
5. Gere capítulo 1, processe jobs, revise, processe jobs… até concluir.
6. Exportar DOCX/PDF.

## 5) Produção / Escala
Este MVP usa um “processador manual” (`POST /api/jobs/process`) para evitar dependências.
Em produção, você deve automatizar:
- Vercel Cron chamando `/api/jobs/process` periodicamente
- ou Upstash QStash/Redis
- ou Supabase Edge Functions + cron

## 6) Pagamentos
Endpoint genérico de webhook:
- `POST /api/webhooks/payments`

Adapte para seu provedor (Asaas/Mercado Pago/etc.):
- validar assinatura do webhook
- mapear evento para `{ user_id, status, current_period_end, ebooks_remaining_in_period }`

## 7) Por que a qualidade fica alta
- Blueprint editorial em JSON com:
  - objetivo do capítulo, “não repetir”, exemplo base
- Capítulo escrito com estrutura fixa (gancho → conceito → aprofundamento → exemplo → aplicação → checklist)
- Revisão automática remove repetição e “frases vazias”

Pronto: seu produto deixa de ser “IA que escreve” e vira “sistema de criação publicável”.
