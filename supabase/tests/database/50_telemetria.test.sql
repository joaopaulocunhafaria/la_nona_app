-- Telemetria: ingestão anônima/logada, tempo ativo que não regride e painel só para admin.
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
	('00000000-0000-0000-0000-000000000000', '99999999-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'a@telemetria.test', '', '{"provider":"email"}', '{"name":"Usuária Telemetria"}', now(), now()),
	('00000000-0000-0000-0000-000000000000', '99999999-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'admin@telemetria.test', '', '{"provider":"email"}', '{}', now(), now());
update public.profiles set role = 'admin' where id = '99999999-0000-4000-8000-000000000002';
insert into public.menu_categories (id, name) values ('cccccccc-0000-4000-8000-000000000050', 'Categoria Telemetria');
insert into public.menu_items (id, name, description, price, category_id)
values ('dddddddd-0000-4000-8000-000000000051', 'Item Telemetria', 'D', 10, 'cccccccc-0000-4000-8000-000000000050');

create temporary table ids (nome text primary key, id uuid);
grant all on ids to anon, authenticated;

-- ---------- anon ----------
set local role anon;
select throws_ok($$ select count(*) from public.telemetry_sessions $$, '42501', null, 'anon não lê sessões diretamente');
select throws_ok($$ select public.iniciar_sessao_telemetria('  ', 'WEB') $$, '22023', 'Identificador anônimo é obrigatório', 'anonymous_id vazio');
select lives_ok($$ insert into ids values ('anon', public.iniciar_sessao_telemetria('anon-telemetria-12345', 'desconhecida')) $$, 'anon inicia sessão');
select lives_ok($$ select public.heartbeat_telemetria((select id from ids where nome = 'anon'), 30) $$, 'heartbeat com 30 s');
select lives_ok($$ select public.heartbeat_telemetria((select id from ids where nome = 'anon'), 10) $$, 'heartbeat atrasado com 10 s');
select lives_ok($$ select public.registrar_acesso_menu('anon-telemetria-12345', 'MOBILE') $$, 'anon registra acesso ao cardápio');
select lives_ok($$ select public.registrar_visualizacao_item('dddddddd-0000-4000-8000-000000000051', 'anon-telemetria-12345') $$, 'anon registra visualização de item');
select lives_ok($$ select public.registrar_visualizacao_item('dddddddd-0000-4000-8000-000000000999', 'anon-telemetria-12345') $$, 'item inexistente é ignorado sem erro');
select throws_ok($$ select public.registrar_login('WEB') $$, '42501', null, 'anon não registra login');
select throws_ok($$ select public.telemetria_online() $$, '42501', null, 'anon não consulta o painel');

reset role;
select results_eq(
	$$ select platform, active_seconds, user_id from public.telemetry_sessions where id = (select id from ids where nome = 'anon') $$,
	$$ values ('WEB'::varchar, 30::bigint, null::uuid) $$,
	'plataforma desconhecida vira WEB e o tempo ativo não regride'
);
select is((select count(*)::int from public.item_view_events where menu_item_id = 'dddddddd-0000-4000-8000-000000000051'), 1, 'visualização gravada');
select is((select platform from public.menu_view_events where anonymous_id = 'anon-telemetria-12345'), 'MOBILE', 'acesso ao menu gravado com a plataforma');

-- ---------- usuário logado ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"99999999-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$ select public.heartbeat_telemetria((select id from ids where nome = 'anon'), 45) $$, 'heartbeat logado na sessão anônima');
select lives_ok($$ select public.registrar_login('WEB') $$, 'registra login');
select lives_ok($$ select public.encerrar_sessao_telemetria((select id from ids where nome = 'anon'), 50) $$, 'encerra sessão');
select throws_ok($$ select public.telemetria_logins() $$, '42501', 'Acesso restrito a administradores.', 'cliente não consulta o painel');

reset role;
select results_eq(
	$$ select user_id, active_seconds, ended_at is not null from public.telemetry_sessions where id = (select id from ids where nome = 'anon') $$,
	$$ values ('99999999-0000-4000-8000-000000000001'::uuid, 50::bigint, true) $$,
	'sessão anônima associada ao usuário e encerrada'
);

-- ---------- admin ----------
insert into public.telemetry_sessions (anonymous_id, platform, last_seen_at) values ('online-anon', 'WEB', now());
insert into public.telemetry_sessions (anonymous_id, platform, last_seen_at) values ('velha', 'WEB', now() - interval '5 minutes');
insert into public.telemetry_sessions (anonymous_id, platform, user_id, last_seen_at)
values ('online-logado', 'WEB', '99999999-0000-4000-8000-000000000001', now());

create temporary table esperado as
select count(*) filter (where user_id is not null)::int as logados, count(*) filter (where user_id is null)::int as anonimos
from public.telemetry_sessions where ended_at is null and last_seen_at > now() - interval '60 seconds';
grant select on esperado to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub":"99999999-0000-4000-8000-000000000002","role":"authenticated"}';
select is((public.telemetria_online() ->> 'loggedIn')::int, (select logados from esperado), 'online conta os logados ativos');
select is((public.telemetria_online() ->> 'anonymous')::int, (select anonimos from esperado), 'online conta os anônimos ativos (sem a sessão parada há 5 min)');
select ok((public.telemetria_logins(now() - interval '1 hour', now() + interval '1 hour', 'hour') ->> 'total')::int >= 1, 'logins no período');
select is(jsonb_typeof(public.telemetria_logins(null, null, 'semana') -> 'series'), 'array', 'granularidade inválida cai em day e devolve série');
select ok((public.telemetria_acessos_menu() ->> 'total')::int >= 1, 'acessos ao cardápio');
select ok(
	(select bool_or(r ->> 'label' = 'Usuária Telemetria') from jsonb_array_elements(public.telemetria_sessoes(now() - interval '1 hour', now() + interval '1 hour', 50) -> 'ranking') r),
	'ranking usa o nome do usuário logado'
);
select ok(
	(select bool_or(r ->> 'name' = 'Item Telemetria' and (r ->> 'views')::int = 1) from jsonb_array_elements(public.telemetria_itens_mais_vistos()) r),
	'itens mais vistos'
);

select * from finish();
rollback;
