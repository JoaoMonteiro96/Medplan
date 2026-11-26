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

-- ============ Notas fiscais e recibos (anexos das despesas) ============
-- Cria uma pasta privada "notas". Cada usuário só vê, envia e apaga os próprios arquivos.
insert into storage.buckets (id, name, public) values ('notas', 'notas', false) on conflict (id) do nothing;
drop policy if exists "notas: ver as minhas" on storage.objects;
drop policy if exists "notas: enviar as minhas" on storage.objects;
drop policy if exists "notas: apagar as minhas" on storage.objects;
create policy "notas: ver as minhas" on storage.objects for select to authenticated
  using (bucket_id = 'notas' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "notas: enviar as minhas" on storage.objects for insert to authenticated
  with check (bucket_id = 'notas' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "notas: apagar as minhas" on storage.objects for delete to authenticated
  using (bucket_id = 'notas' and auth.uid()::text = (storage.foldername(name))[1]);
-- ============ Sallos: central de cotações ============
-- Uma função busca os preços na brapi (com o token guardado no Supabase)
-- e grava aqui. O app de cada pessoa só lê. Ninguém precisa de token.
create table if not exists public.cotacoes (
  ticker     text primary key,
  preco      numeric not null,
  atualizado timestamptz not null default now()
);
alter table public.cotacoes enable row level security;
drop policy if exists "logados leem cotacoes" on public.cotacoes;
create policy "logados leem cotacoes" on public.cotacoes for select to authenticated using (true);

-- Quais ativos cada pessoa tem (só o código), para a função saber o que buscar
create table if not exists public.cotacoes_pedidos (
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ticker   text not null check (ticker ~ '^[A-Z0-9]{4}[0-9]{1,2}$'),
  visto_em timestamptz not null default now(),
  primary key (user_id, ticker)
);
alter table public.cotacoes_pedidos enable row level security;
drop policy if exists "dono le pedido" on public.cotacoes_pedidos;
drop policy if exists "dono cria pedido" on public.cotacoes_pedidos;
drop policy if exists "dono altera pedido" on public.cotacoes_pedidos;
create policy "dono le pedido"     on public.cotacoes_pedidos for select to authenticated using (auth.uid() = user_id);
create policy "dono cria pedido"   on public.cotacoes_pedidos for insert to authenticated with check (auth.uid() = user_id);
create policy "dono altera pedido" on public.cotacoes_pedidos for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Atualização automática: 11h, 13h, 15h e 18h30 (horário de Brasília), dias úteis
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule(jobname) from cron.job where jobname in ('sallos-cotacoes', 'sallos-cotacoes-fechamento');
select cron.schedule('sallos-cotacoes', '0 14,16,18 * * 1-5',
  $$ select net.http_post(url := 'https://hhqxkizvcgnohklztkef.supabase.co/functions/v1/cotacoes', headers := '{"Content-Type": "application/json"}'::jsonb, body := '{"todos": true}'::jsonb) $$);
select cron.schedule('sallos-cotacoes-fechamento', '30 21 * * 1-5',
  $$ select net.http_post(url := 'https://hhqxkizvcgnohklztkef.supabase.co/functions/v1/cotacoes', headers := '{"Content-Type": "application/json"}'::jsonb, body := '{"todos": true}'::jsonb) $$);

-- ============================================================
-- Uso anônimo do app: quais telas são abertas, por dia
-- (só um código aleatório do aparelho; sem nome, e-mail ou valores)
-- ============================================================
create table if not exists public.uso_telas (
  aparelho text not null check (char_length(aparelho) between 8 and 64),
  dia      date not null,
  tela     text not null check (char_length(tela) between 1 and 30),
  vezes    int  not null check (vezes between 1 and 500),
  primary key (aparelho, dia, tela)
);
-- ninguém lê nem grava direto pelo app: só pela função abaixo
alter table public.uso_telas enable row level security;
revoke all on public.uso_telas from anon, authenticated;

create or replace function public.registrar_uso(p_aparelho text, p_linhas jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(p_linhas) <> 'array' or jsonb_array_length(p_linhas) > 60 or char_length(p_aparelho) not between 8 and 64 then return; end if;
  insert into public.uso_telas (aparelho, dia, tela, vezes)
  select p_aparelho, (l->>'dia')::date, left(l->>'tela', 30), least(500, greatest(1, (l->>'vezes')::int))
  from jsonb_array_elements(p_linhas) l
  where (l->>'dia')::date between current_date - 30 and current_date + 1
  on conflict on constraint uso_telas_pkey do update set vezes = greatest(public.uso_telas.vezes, excluded.vezes);
end $$;
revoke all on function public.registrar_uso(text, jsonb) from public;
grant execute on function public.registrar_uso(text, jsonb) to anon, authenticated;

-- Para ver o resumo (rode no SQL Editor do Supabase):
-- select tela, count(distinct aparelho) as pessoas, sum(vezes) as aberturas
-- from public.uso_telas where dia >= current_date - 30 group by tela order by pessoas desc, aberturas desc;

-- ============================================================
-- Resumo de uso (só totais): base do relatório em PDF a cada 72 horas
-- Devolve números somados (quantos aparelhos, quantas aberturas, por dia e por tela).
-- Não devolve o código de nenhum aparelho nem nada de pessoa nenhuma.
-- ============================================================
create or replace function public.resumo_uso(dias int default 3)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  n   int  := least(90, greatest(1, coalesce(dias, 3)));
  ate date := current_date;
  de  date := current_date - (least(90, greatest(1, coalesce(dias, 3))) - 1);
begin
  return jsonb_build_object(
    'de', de, 'ate', ate, 'dias', n,
    'aparelhos',          (select count(distinct aparelho) from uso_telas where dia between de and ate),
    'aparelhos_antes',    (select count(distinct aparelho) from uso_telas where dia between de - n and de - 1),
    'aberturas',          (select coalesce(sum(vezes), 0) from uso_telas where dia between de and ate),
    'aberturas_antes',    (select coalesce(sum(vezes), 0) from uso_telas where dia between de - n and de - 1),
    'novos',              (select count(*) from (select aparelho from uso_telas group by aparelho having min(dia) between de and ate) x),
    'aparelhos_30',       (select count(distinct aparelho) from uso_telas where dia > ate - 30),
    'aparelhos_total',    (select count(distinct aparelho) from uso_telas),
    'por_dia', coalesce((select jsonb_agg(jsonb_build_object('dia', d, 'aparelhos', a, 'aberturas', v) order by d)
                 from (select dia d, count(distinct aparelho) a, sum(vezes) v from uso_telas
                       where dia > ate - 14 group by dia) x), '[]'::jsonb),
    'por_tela', coalesce((select jsonb_agg(jsonb_build_object('tela', t, 'aparelhos', a, 'aberturas', v) order by a desc, v desc)
                 from (select tela t, count(distinct aparelho) a, sum(vezes) v from uso_telas
                       where dia between de and ate group by tela) x), '[]'::jsonb),
    'por_tela_30', coalesce((select jsonb_agg(jsonb_build_object('tela', t, 'aparelhos', a, 'aberturas', v) order by a desc, v desc)
                 from (select tela t, count(distinct aparelho) a, sum(vezes) v from uso_telas
                       where dia > ate - 30 group by tela) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.resumo_uso(int) from public;
grant execute on function public.resumo_uso(int) to anon, authenticated;

-- ============================================================
-- Excluir minha conta (botão em Configurações → Nuvem e conta)
-- Apaga os dados, os pedidos de cotação e o login de quem chamou.
-- Só apaga a própria conta (usa auth.uid()). As notas fiscais o app
-- apaga antes, pela pasta "notas".
-- ============================================================
create or replace function public.excluir_minha_conta()
returns void language plpgsql security definer set search_path = public, auth as $$
declare eu uuid := auth.uid();
begin
  if eu is null then raise exception 'sem login'; end if;
  delete from public.records where user_id = eu;
  delete from public.cotacoes_pedidos where user_id = eu;
  delete from auth.users where id = eu;
end $$;
revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;

-- ============================================================
-- Renda fixa: preços do Tesouro Direto e CDI diário (dados públicos)
-- Quem grava é só a função "rendafixa" (chave de serviço). Todo mundo lê.
-- ============================================================
create table if not exists public.tesouro_precos (
  titulo      text    not null,   -- ex.: "Tesouro IPCA+"
  vencimento  date    not null,
  data        date    not null,   -- dia do preço
  taxa_compra numeric,
  taxa_venda  numeric,
  pu_compra   numeric,            -- preço de compra de 1 título nesse dia
  pu_venda    numeric,            -- preço de resgate de 1 título nesse dia
  pu_base     numeric,
  primary key (titulo, vencimento, data)
);
alter table public.tesouro_precos enable row level security;
drop policy if exists "todos leem tesouro" on public.tesouro_precos;
create policy "todos leem tesouro" on public.tesouro_precos for select to anon, authenticated using (true);

create table if not exists public.cdi_diario (
  data date primary key,
  taxa numeric not null           -- % ao dia (série 12 do Banco Central)
);
alter table public.cdi_diario enable row level security;
drop policy if exists "todos leem cdi" on public.cdi_diario;
create policy "todos leem cdi" on public.cdi_diario for select to anon, authenticated using (true);

-- IPCA do mês (série 433 do Banco Central). Usado para comparar a carteira com a inflação.
create table if not exists public.ipca_mensal (
  mes  date primary key,           -- primeiro dia do mês
  taxa numeric not null            -- % no mês
);
alter table public.ipca_mensal enable row level security;
drop policy if exists "todos leem ipca" on public.ipca_mensal;
create policy "todos leem ipca" on public.ipca_mensal for select to anon, authenticated using (true);

-- preço mais recente de cada título que ainda não venceu
create or replace view public.tesouro_hoje with (security_invoker = true) as
  select distinct on (titulo, vencimento) titulo, vencimento, data, taxa_compra, taxa_venda, pu_compra, pu_venda
  from public.tesouro_precos
  where vencimento >= current_date
  order by titulo, vencimento, data desc;
grant select on public.tesouro_hoje to anon, authenticated;

-- todo dia útil, às 10h15 e às 17h15 de Brasília
select cron.unschedule(jobname) from cron.job where jobname = 'sallos-rendafixa';
select cron.schedule('sallos-rendafixa', '15 13,20 * * 1-5',
  $$ select net.http_post(url := 'https://hhqxkizvcgnohklztkef.supabase.co/functions/v1/rendafixa', headers := '{"Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 120000) $$);

-- ============================================================
-- Variação do dia na carteira: fechamento do pregão anterior de cada ativo (gravado pela função "cotacoes")
-- ============================================================
alter table public.cotacoes add column if not exists anterior numeric;

-- ============================================================
-- Análise completa de ações e FIIs: histórico de fechamento (B3, COTAHIST) e proventos (B3)
-- Dados públicos. Quem grava são as funções "historico" e "proventos". Todo mundo lê o histórico.
-- ============================================================
create table if not exists public.precos_hist (
  ticker     text    not null,
  data       date    not null,
  fechamento numeric not null,
  maxima     numeric,           -- máxima do dia
  minima     numeric,           -- mínima do dia
  primary key (ticker, data)
);
alter table public.precos_hist add column if not exists maxima numeric, add column if not exists minima numeric;
alter table public.precos_hist enable row level security;
drop policy if exists "todos leem precos" on public.precos_hist;
create policy "todos leem precos" on public.precos_hist for select to anon, authenticated using (true);

create table if not exists public.proventos_b3 (
  ticker text primary key,
  dados  jsonb not null,
  em     timestamptz not null default now()
);
alter table public.proventos_b3 enable row level security;  -- só a função lê e grava

-- todo dia útil às 8h de Brasília: fechamento do dia útil anterior
select cron.unschedule(jobname) from cron.job where jobname = 'sallos-historico';
select cron.schedule('sallos-historico', '0 11 * * 1-5',
  $$ select net.http_post(url := 'https://hhqxkizvcgnohklztkef.supabase.co/functions/v1/historico', headers := '{"Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 120000) $$);

-- ============================================================
-- Proteções e contagem nova (26/11/2026)
-- Rode este bloco inteiro de uma vez. Antes, crie os dois códigos no cofre (Vault) do Supabase:
--   select vault.create_secret('<invente um código longo>', 'sallos_cron');        -- senha das tarefas automáticas
--   select vault.create_secret('<invente outro código longo>', 'sallos_relatorio'); -- senha do relatório de uso
-- O código 'sallos_cron' também vai em Edge Functions > Secrets com o nome CRON_SEGREDO.
-- Enquanto um código não existir, a parte dele continua aberta como antes (nada para de funcionar na troca).
-- ============================================================

-- cabeçalhos que as tarefas automáticas mandam para as funções (com a senha do cofre)
create or replace function public.sallos_cron_headers()
returns jsonb language sql stable security definer set search_path = public, vault as $$
  select jsonb_build_object('Content-Type', 'application/json', 'x-sallos-cron',
    coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'sallos_cron' limit 1), ''));
$$;
revoke all on function public.sallos_cron_headers() from public, anon, authenticated;

select cron.unschedule(jobname) from cron.job where jobname in ('sallos-cotacoes', 'sallos-cotacoes-fechamento', 'sallos-rendafixa', 'sallos-historico');
select cron.schedule('sallos-cotacoes', '0 14,16,18 * * 1-5',
  $$ select net.http_post(url := 'https://hhqxkizvcgnohklztkef.supabase.co/functions/v1/cotacoes', headers := public.sallos_cron_headers(), body := '{"todos": true}'::jsonb) $$);
select cron.schedule('sallos-cotacoes-fechamento', '30 21 * * 1-5',
  $$ select net.http_post(url := 'https://hhqxkizvcgnohklztkef.supabase.co/functions/v1/cotacoes', headers := public.sallos_cron_headers(), body := '{"todos": true}'::jsonb) $$);
select cron.schedule('sallos-rendafixa', '15 13,20 * * 1-5',
  $$ select net.http_post(url := 'https://hhqxkizvcgnohklztkef.supabase.co/functions/v1/rendafixa', headers := public.sallos_cron_headers(), body := '{}'::jsonb, timeout_milliseconds := 120000) $$);
select cron.schedule('sallos-historico', '0 11 * * 1-5',
  $$ select net.http_post(url := 'https://hhqxkizvcgnohklztkef.supabase.co/functions/v1/historico', headers := public.sallos_cron_headers(), body := '{}'::jsonb, timeout_milliseconds := 120000) $$);

-- contagem de uso: limite por dia contra enchimento com aparelhos falsos
create index if not exists uso_telas_dia on public.uso_telas (dia);
create or replace function public.registrar_uso(p_aparelho text, p_linhas jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(p_linhas) <> 'array' or jsonb_array_length(p_linhas) > 60 or char_length(p_aparelho) not between 8 and 64 then return; end if;
  -- aparelho novo no dia só entra se o dia ainda tiver menos de 5.000 aparelhos
  if not exists (select 1 from uso_telas where aparelho = p_aparelho and dia = current_date)
     and (select count(distinct aparelho) from uso_telas where dia = current_date) >= 5000 then return; end if;
  insert into public.uso_telas (aparelho, dia, tela, vezes)
  select p_aparelho, (l->>'dia')::date, left(l->>'tela', 30), least(500, greatest(1, (l->>'vezes')::int))
  from jsonb_array_elements(p_linhas) l
  where (l->>'dia')::date between current_date - 30 and current_date + 1
  on conflict on constraint uso_telas_pkey do update set vezes = greatest(public.uso_telas.vezes, excluded.vezes);
end $$;
revoke all on function public.registrar_uso(text, jsonb) from public;
grant execute on function public.registrar_uso(text, jsonb) to anon, authenticated;

-- resumo de uso: só totais, e só para quem manda a senha do relatório (cabeçalho x-relatorio-key)
-- Linhas cuja tela começa com "_" não são telas: "_modo:simples" / "_modo:completo" (modo usado no dia)
-- e "_m:guia", "_m:plantao", "_m:conta", "_m:recebi" (primeiros passos de cada aparelho, uma vez só).
create or replace function public.resumo_uso(dias int default 3)
returns jsonb language plpgsql stable security definer set search_path = public, vault as $$
declare
  n   int  := least(90, greatest(1, coalesce(dias, 3)));
  ate date := current_date;
  de  date := current_date - (least(90, greatest(1, coalesce(dias, 3))) - 1);
  senha text := (select decrypted_secret from vault.decrypted_secrets where name = 'sallos_relatorio' limit 1);
  veio  text := coalesce(current_setting('request.headers', true)::json ->> 'x-relatorio-key', '');
begin
  if senha is not null and senha <> '' and veio <> senha then raise exception 'sem permissão'; end if;
  return (
  with t as (select * from uso_telas where left(tela, 1) <> '_'),
       primeiro as (select aparelho, min(dia) d0 from t group by aparelho),
       marcos as (select aparelho, tela from uso_telas where left(tela, 3) = '_m:' group by aparelho, tela),
       novos30 as (select aparelho from primeiro where d0 > ate - 30)
  select jsonb_build_object(
    'de', de, 'ate', ate, 'dias', n,
    'aparelhos',          (select count(distinct aparelho) from t where dia between de and ate),
    'aparelhos_antes',    (select count(distinct aparelho) from t where dia between de - n and de - 1),
    'aberturas',          (select coalesce(sum(vezes), 0) from t where dia between de and ate),
    'aberturas_antes',    (select coalesce(sum(vezes), 0) from t where dia between de - n and de - 1),
    'novos',              (select count(*) from primeiro where d0 between de and ate),
    'aparelhos_30',       (select count(distinct aparelho) from t where dia > ate - 30),
    'aparelhos_total',    (select count(*) from primeiro),
    'por_dia', coalesce((select jsonb_agg(jsonb_build_object('dia', d, 'aparelhos', a, 'aberturas', v) order by d)
                 from (select dia d, count(distinct aparelho) a, sum(vezes) v from t where dia > ate - 14 group by dia) x), '[]'::jsonb),
    'por_tela', coalesce((select jsonb_agg(jsonb_build_object('tela', tl, 'aparelhos', a, 'aberturas', v) order by a desc, v desc)
                 from (select tela tl, count(distinct aparelho) a, sum(vezes) v from t where dia between de and ate group by tela) x), '[]'::jsonb),
    'por_tela_30', coalesce((select jsonb_agg(jsonb_build_object('tela', tl, 'aparelhos', a, 'aberturas', v) order by a desc, v desc)
                 from (select tela tl, count(distinct aparelho) a, sum(vezes) v from t where dia > ate - 30 group by tela) x), '[]'::jsonb),
    -- quem volta: dos que começaram nos últimos 90 dias, quantos usaram de novo no dia seguinte, na 2ª semana e depois de 1 mês
    'volta', jsonb_build_object(
      'd1_base',  (select count(*) from primeiro where d0 between ate - 90 and ate - 1),
      'd1',       (select count(*) from primeiro p where d0 between ate - 90 and ate - 1 and exists (select 1 from t where t.aparelho = p.aparelho and t.dia = p.d0 + 1)),
      'd7_base',  (select count(*) from primeiro where d0 between ate - 90 and ate - 13),
      'd7',       (select count(*) from primeiro p where d0 between ate - 90 and ate - 13 and exists (select 1 from t where t.aparelho = p.aparelho and t.dia between p.d0 + 7 and p.d0 + 13)),
      'd30_base', (select count(*) from primeiro where d0 between ate - 90 and ate - 36),
      'd30',      (select count(*) from primeiro p where d0 between ate - 90 and ate - 36 and exists (select 1 from t where t.aparelho = p.aparelho and t.dia between p.d0 + 30 and p.d0 + 36))),
    -- primeiros passos de quem começou nos últimos 30 dias
    'passos', jsonb_build_object(
      'novos',    (select count(*) from novos30),
      'guia',     (select count(*) from novos30 x where exists (select 1 from marcos m where m.aparelho = x.aparelho and m.tela = '_m:guia')),
      'plantao',  (select count(*) from novos30 x where exists (select 1 from marcos m where m.aparelho = x.aparelho and m.tela = '_m:plantao')),
      'conta',    (select count(*) from novos30 x where exists (select 1 from marcos m where m.aparelho = x.aparelho and m.tela = '_m:conta')),
      'recebi',   (select count(*) from novos30 x where exists (select 1 from marcos m where m.aparelho = x.aparelho and m.tela = '_m:recebi'))),
    -- modo usado no período
    'modos', jsonb_build_object(
      'simples',  (select count(distinct aparelho) from uso_telas where tela = '_modo:simples' and dia between de and ate),
      'completo', (select count(distinct aparelho) from uso_telas where tela = '_modo:completo' and dia between de and ate))
  ));
end $$;
revoke all on function public.resumo_uso(int) from public;
grant execute on function public.resumo_uso(int) to anon, authenticated;
