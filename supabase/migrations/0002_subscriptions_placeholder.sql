-- FarmPro — estrutura mínima para assinatura (preparação para o futuro).
--
-- Ainda NÃO há cobrança nem gateway de pagamento integrado. Isso só garante
-- que, quando o modelo de assinatura for decidido (provedor de pagamento,
-- planos, se a cobrança é por conta ou por fazenda etc.), não seja preciso
-- alterar a base de usuários/fazendas já em uso — só preencher esta tabela.
--
-- Modelo assumido por enquanto: assinatura por CONTA (profile), cobrindo
-- todas as fazendas daquele usuário — o padrão mais comum em SaaS. Pode ser
-- revisto quando a cobrança for implementada de verdade.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled')),
  plan text,
  provider text,                 -- ex.: 'stripe'
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions: usuário vê a própria assinatura" on public.subscriptions;
create policy "subscriptions: usuário vê a própria assinatura"
  on public.subscriptions for select
  using (auth.uid() = owner_id);

-- Toda conta nova começa em trial. Sem lógica de cobrança real ainda — isso
-- só garante que o campo sempre exista pra consulta no app.
create or replace function public.handle_new_profile_subscription()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.subscriptions (owner_id)
  values (new.id);
  return new;
end;
$$;

drop trigger if exists on_profile_created_subscription on public.profiles;
create trigger on_profile_created_subscription
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile_subscription();
