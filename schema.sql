-- =====================================================================
-- Mediplan: estrutura do banco de dados (Supabase / PostgreSQL)
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Pode rodar de novo sem problema: o script não apaga dados.
-- =====================================================================

-- Tabela principal: cada item do app (vínculo, plantão, despesa,
-- investimento, meta...) é uma linha, separada por "collection".
-- Assim o app pode ganhar campos novos sem precisar mudar a tabela.
create table if not exists public.records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  collection text        not null,
  id         text        not null,
  data       jsonb       not null,
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, id)
);

create index if not exists records_user_updated_idx on public.records (user_id, updated_at);

-- Atualiza a data de modificação automaticamente
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists records_set_updated_at on public.records;
create trigger records_set_updated_at before update on public.records
for each row execute function public.set_updated_at();

-- Segurança: cada pessoa só enxerga e altera as próprias linhas
alter table public.records enable row level security;

drop policy if exists "dono pode ler" on public.records;
drop policy if exists "dono pode criar" on public.records;
drop policy if exists "dono pode alterar" on public.records;
drop policy if exists "dono pode apagar" on public.records;

create policy "dono pode ler"     on public.records for select using (auth.uid() = user_id);
create policy "dono pode criar"   on public.records for insert with check (auth.uid() = user_id);
create policy "dono pode alterar" on public.records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono pode apagar"  on public.records for delete using (auth.uid() = user_id);

-- =====================================================================
-- Visões em formato de tabela, para consultar e fazer relatórios no
-- Supabase (Table Editor / SQL). Elas respeitam a mesma segurança.
-- =====================================================================
create or replace view public.vw_vinculos with (security_invoker = true) as
select user_id, id,
       data->>'nome'                          as nome,
       data->>'tipo'                          as tipo,
       nullif(data->>'valorMensal','')::numeric as valor_mensal,
       nullif(data->>'taxOverride','')::numeric as tributacao,
       nullif(data->>'prazoPadrao','')::int     as prazo_dias,
       nullif(data->>'prazoMeses','')::int      as prazo_meses,
       updated_at
from public.records where collection = 'vinculos' and not deleted;

create or replace view public.vw_plantoes with (security_invoker = true) as
select r.user_id, r.id,
       (r.data->>'date')::date                  as data_plantao,
       nullif(r.data->>'payDate','')::date      as data_pagamento,
       v.data->>'nome'                          as vinculo,
       nullif(r.data->>'gross','')::numeric     as valor_bruto,
       nullif(r.data->>'hours','')::numeric     as horas,
       coalesce((r.data->>'recebido')::boolean, false) as recebido,
       r.updated_at
from public.records r
left join public.records v on v.user_id = r.user_id and v.collection = 'vinculos' and v.id = r.data->>'vinculoId'
where r.collection = 'shifts' and not r.deleted;

create or replace view public.vw_despesas with (security_invoker = true) as
select user_id, id, 'pontual' as tipo,
       data->>'description'                    as descricao,
       data->>'category'                       as categoria,
       nullif(data->>'amount','')::numeric      as valor,
       nullif(data->>'dueDate','')::date        as vencimento,
       coalesce((data->>'paid')::boolean, false) as pago,
       updated_at
from public.records where collection = 'expenses' and not deleted
union all
select user_id, id, 'recorrente',
       data->>'description', data->>'category',
       nullif(data->>'amount','')::numeric, null,
       null, updated_at
from public.records where collection = 'recurringExpenses' and not deleted;

create or replace view public.vw_investimentos with (security_invoker = true) as
select user_id, id,
       nullif(data->>'date','')::date           as data,
       data->>'category'                       as categoria,
       data->>'description'                    as ativo,
       data->>'tipo'                           as tipo,
       nullif(data->>'qty','')::numeric         as quantidade,
       nullif(data->>'price','')::numeric       as preco,
       nullif(data->>'amount','')::numeric      as valor,
       updated_at
from public.records where collection = 'investments' and not deleted;

create or replace view public.vw_metas with (security_invoker = true) as
select user_id, id,
       data->>'nome'                           as nome,
       nullif(data->>'valorAlvo','')::numeric   as valor_alvo,
       nullif(data->>'valorAtual','')::numeric  as valor_atual,
       nullif(data->>'prazo','')::date          as prazo,
       updated_at
from public.records where collection = 'goals' and not deleted;
