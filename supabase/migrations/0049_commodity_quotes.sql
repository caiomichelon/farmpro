-- Cotações reais de commodities (boi gordo, milho, soja), vindas da B3 —
-- substitui o mock estático de src/data/commodities.ts.
--
-- Fonte: arquivo público "TradeInformationConsolidatedFile" da B3
-- (arquivos.b3.com.br), sem chave/cadastro, atualizado por uma Edge
-- Function (supabase/functions/sync-b3-quotes) agendada via pg_cron logo
-- após o fechamento do pregão. É fechamento diário, não tempo real — a B3
-- não oferece cotação intradiária gratuita pra terceiros.
--
-- Só tem boi gordo (BGI), milho (CCM) e soja (SJC) porque são os únicos
-- desses quatro que a B3 negocia (soja é liquidada em dólar, por isso a
-- coluna currency). Algodão não tem contrato futuro ativo na B3 hoje — não
-- dá pra fabricar esse dado; fica de fora até surgir uma fonte real.
create table if not exists public.commodity_quotes (
  id text primary key,
  label text not null,
  unit text not null,
  currency text not null default 'BRL' check (currency in ('BRL', 'USD')),
  price numeric not null,
  change_percent numeric not null default 0,
  contract text,
  quote_date date not null,
  updated_at timestamptz not null default now()
);

alter table public.commodity_quotes enable row level security;

-- Dado de referência público (preço de fechamento da bolsa) — sem relação
-- com fazenda/usuário, então liberado pra qualquer sessão autenticada ler.
-- Só a Edge Function (via service_role, que ignora RLS) escreve aqui.
drop policy if exists "commodity_quotes: qualquer usuário autenticado lê" on public.commodity_quotes;
create policy "commodity_quotes: qualquer usuário autenticado lê"
  on public.commodity_quotes for select
  to authenticated
  using (true);
