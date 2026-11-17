-- Regras gerais de segurança: valem para qualquer tabela nova em `public`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select is(
  (select array_agg(c.relname::text order by c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  null,
  'toda tabela em public tem RLS habilitado'
);

select is(
  (select array_agg(c.relname::text order by c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)),
  null,
  'toda tabela em public tem ao menos uma policy explícita'
);

select is(
  (select array_agg(p.proname::text order by p.proname)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')),
  null,
  'toda função em public fixa o search_path'
);

select is(
  (select array_agg(p.proname::text order by p.proname)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and not ('search_path=""' = any (coalesce(p.proconfig, '{}')))),
  null,
  'funções security definer usam search_path vazio'
);

select * from finish();
rollback;
