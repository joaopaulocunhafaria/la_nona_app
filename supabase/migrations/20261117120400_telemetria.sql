-- Telemetria de uso: sessões (tempo ativo, online agora), logins, acessos ao cardápio e visualizações de itens.
-- As tabelas não têm grants diretos: a ingestão (anon/authenticated) e as consultas do painel (admin)
-- passam só pelas funções abaixo.

create table public.telemetry_sessions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid references public.profiles (id) on delete set null,
	anonymous_id varchar(64) not null,
	platform varchar(16) not null check (platform in ('WEB', 'MOBILE')),
	started_at timestamptz not null default now(),
	last_seen_at timestamptz not null default now(),
	active_seconds bigint not null default 0 check (active_seconds >= 0),
	ended_at timestamptz
);

create index idx_telemetry_sessions_online on public.telemetry_sessions (ended_at, last_seen_at);
create index idx_telemetry_sessions_user_id on public.telemetry_sessions (user_id);
create index idx_telemetry_sessions_started_at on public.telemetry_sessions (started_at);

create table public.login_events (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles (id) on delete cascade,
	platform varchar(16) check (platform in ('WEB', 'MOBILE')),
	created_at timestamptz not null default now()
);

create index idx_login_events_created_at on public.login_events (created_at);
create index idx_login_events_user_id on public.login_events (user_id);

create table public.item_view_events (
	id uuid primary key default gen_random_uuid(),
	menu_item_id uuid not null references public.menu_items (id) on delete cascade,
	user_id uuid references public.profiles (id) on delete set null,
	anonymous_id varchar(64),
	platform varchar(16) check (platform in ('WEB', 'MOBILE')),
	created_at timestamptz not null default now()
);

create index idx_item_view_events_menu_item_id on public.item_view_events (menu_item_id);
create index idx_item_view_events_created_at on public.item_view_events (created_at);

-- Cada acesso à lista do cardápio conta (sem deduplicação).
create table public.menu_view_events (
	id uuid primary key default gen_random_uuid(),
	user_id uuid references public.profiles (id) on delete set null,
	anonymous_id varchar(64),
	platform varchar(16) check (platform in ('WEB', 'MOBILE')),
	created_at timestamptz not null default now()
);

create index idx_menu_view_events_created_at on public.menu_view_events (created_at);

alter table public.telemetry_sessions enable row level security;
alter table public.login_events enable row level security;
alter table public.item_view_events enable row level security;
alter table public.menu_view_events enable row level security;

revoke all on table public.telemetry_sessions, public.login_events, public.item_view_events, public.menu_view_events
from anon, authenticated;

-- Sem acesso direto: só as funções security definer leem/gravam.
create policy telemetry_sessions_sem_acesso_direto on public.telemetry_sessions
for all to anon, authenticated using (false) with check (false);
create policy login_events_sem_acesso_direto on public.login_events
for all to anon, authenticated using (false) with check (false);
create policy item_view_events_sem_acesso_direto on public.item_view_events
for all to anon, authenticated using (false) with check (false);
create policy menu_view_events_sem_acesso_direto on public.menu_view_events
for all to anon, authenticated using (false) with check (false);

-- Plataforma informada pelo cliente, com fallback seguro para WEB (telemetria nunca quebra o fluxo).
create or replace function public.normalizar_plataforma(p_plataforma text)
returns text
language sql
immutable
set search_path = ''
as $$
	select case when upper(trim(coalesce(p_plataforma, ''))) = 'MOBILE' then 'MOBILE' else 'WEB' end;
$$;

revoke all on function public.normalizar_plataforma(text) from public, anon, authenticated;

create or replace function public.normalizar_anonymous_id(p_anonymous_id text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
	v_id text := trim(coalesce(p_anonymous_id, ''));
begin
	if v_id = '' then
		raise exception 'Identificador anônimo é obrigatório' using errcode = '22023';
	end if;
	return left(v_id, 64);
end;
$$;

revoke all on function public.normalizar_anonymous_id(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Ingestão (anon e authenticated). O usuário logado vem de auth.uid().
-- ---------------------------------------------------------------------------

create or replace function public.iniciar_sessao_telemetria(p_anonymous_id text, p_plataforma text default 'WEB')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_id uuid;
begin
	insert into public.telemetry_sessions (user_id, anonymous_id, platform)
	values ((select auth.uid()), public.normalizar_anonymous_id(p_anonymous_id), public.normalizar_plataforma(p_plataforma))
	returning id into v_id;
	return v_id;
end;
$$;

-- Atualiza last_seen e o tempo ativo (que nunca regride: heartbeats podem chegar fora de ordem).
-- Uma sessão iniciada anônima é associada ao usuário quando ele loga.
create or replace function public.heartbeat_telemetria(p_sessao uuid, p_segundos bigint default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
	update public.telemetry_sessions s
	set last_seen_at = now(),
		active_seconds = greatest(s.active_seconds, coalesce(p_segundos, 0)),
		user_id = coalesce(s.user_id, (select auth.uid()))
	where s.id = p_sessao and s.ended_at is null;
end;
$$;

create or replace function public.encerrar_sessao_telemetria(p_sessao uuid, p_segundos bigint default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
	update public.telemetry_sessions s
	set last_seen_at = now(),
		ended_at = now(),
		active_seconds = greatest(s.active_seconds, coalesce(p_segundos, 0)),
		user_id = coalesce(s.user_id, (select auth.uid()))
	where s.id = p_sessao and s.ended_at is null;
end;
$$;

create or replace function public.registrar_acesso_menu(p_anonymous_id text, p_plataforma text default 'WEB')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
	insert into public.menu_view_events (user_id, anonymous_id, platform)
	values ((select auth.uid()), public.normalizar_anonymous_id(p_anonymous_id), public.normalizar_plataforma(p_plataforma));
end;
$$;

-- Item inexistente é ignorado em silêncio.
create or replace function public.registrar_visualizacao_item(
	p_menu_item_id uuid,
	p_anonymous_id text,
	p_plataforma text default 'WEB'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
	if not exists (select 1 from public.menu_items m where m.id = p_menu_item_id) then
		return;
	end if;

	insert into public.item_view_events (menu_item_id, user_id, anonymous_id, platform)
	values (
		p_menu_item_id,
		(select auth.uid()),
		public.normalizar_anonymous_id(p_anonymous_id),
		public.normalizar_plataforma(p_plataforma)
	);
end;
$$;

create or replace function public.registrar_login(p_plataforma text default 'WEB')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_uid uuid := (select auth.uid());
begin
	if v_uid is null then
		raise exception 'Usuário não autenticado.' using errcode = '42501';
	end if;

	insert into public.login_events (user_id, platform) values (v_uid, public.normalizar_plataforma(p_plataforma));
end;
$$;

revoke all on function public.iniciar_sessao_telemetria(text, text) from public, anon, authenticated;
revoke all on function public.heartbeat_telemetria(uuid, bigint) from public, anon, authenticated;
revoke all on function public.encerrar_sessao_telemetria(uuid, bigint) from public, anon, authenticated;
revoke all on function public.registrar_acesso_menu(text, text) from public, anon, authenticated;
revoke all on function public.registrar_visualizacao_item(uuid, text, text) from public, anon, authenticated;
revoke all on function public.registrar_login(text) from public, anon, authenticated;

grant execute on function public.iniciar_sessao_telemetria(text, text) to anon, authenticated;
grant execute on function public.heartbeat_telemetria(uuid, bigint) to anon, authenticated;
grant execute on function public.encerrar_sessao_telemetria(uuid, bigint) to anon, authenticated;
grant execute on function public.registrar_acesso_menu(text, text) to anon, authenticated;
grant execute on function public.registrar_visualizacao_item(uuid, text, text) to anon, authenticated;
grant execute on function public.registrar_login(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Painel do administrador. Período padrão: últimos 30 dias até agora.
-- ---------------------------------------------------------------------------

create or replace function public.exigir_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
	if not public.eh_admin() then
		raise exception 'Acesso restrito a administradores.' using errcode = '42501';
	end if;
end;
$$;

revoke all on function public.exigir_admin() from public, anon, authenticated;

-- Sessões vistas nos últimos 60 segundos e ainda não encerradas.
create or replace function public.telemetria_online()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
	v_limite timestamptz := now() - interval '60 seconds';
begin
	perform public.exigir_admin();

	return (
		select jsonb_build_object(
			'loggedIn', count(*) filter (where s.user_id is not null),
			'anonymous', count(*) filter (where s.user_id is null)
		)
		from public.telemetry_sessions s
		where s.ended_at is null and s.last_seen_at > v_limite
	);
end;
$$;

create or replace function public.telemetria_logins(
	p_de timestamptz default null,
	p_ate timestamptz default null,
	p_granularidade text default 'day'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
	v_ate timestamptz := coalesce(p_ate, now());
	v_de timestamptz := coalesce(p_de, coalesce(p_ate, now()) - interval '30 days');
	v_bucket text := case when lower(coalesce(p_granularidade, '')) = 'hour' then 'hour' else 'day' end;
begin
	perform public.exigir_admin();

	return jsonb_build_object(
		'total', (select count(*) from public.login_events e where e.created_at between v_de and v_ate),
		'distinctUsers', (select count(distinct e.user_id) from public.login_events e where e.created_at between v_de and v_ate),
		'series', coalesce((
			select jsonb_agg(jsonb_build_object('bucket', b.bucket, 'count', b.total) order by b.bucket)
			from (
				select date_trunc(v_bucket, e.created_at) as bucket, count(*) as total
				from public.login_events e
				where e.created_at between v_de and v_ate
				group by 1
			) b
		), '[]'::jsonb)
	);
end;
$$;

create or replace function public.telemetria_acessos_menu(
	p_de timestamptz default null,
	p_ate timestamptz default null,
	p_granularidade text default 'day'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
	v_ate timestamptz := coalesce(p_ate, now());
	v_de timestamptz := coalesce(p_de, coalesce(p_ate, now()) - interval '30 days');
	v_bucket text := case when lower(coalesce(p_granularidade, '')) = 'hour' then 'hour' else 'day' end;
begin
	perform public.exigir_admin();

	return jsonb_build_object(
		'total', (select count(*) from public.menu_view_events e where e.created_at between v_de and v_ate),
		'series', coalesce((
			select jsonb_agg(jsonb_build_object('bucket', b.bucket, 'count', b.total) order by b.bucket)
			from (
				select date_trunc(v_bucket, e.created_at) as bucket, count(*) as total
				from public.menu_view_events e
				where e.created_at between v_de and v_ate
				group by 1
			) b
		), '[]'::jsonb)
	);
end;
$$;

-- Tempo médio de sessão e ranking de tempo de acesso (logados por usuário, anônimos por anonymous_id).
create or replace function public.telemetria_sessoes(
	p_de timestamptz default null,
	p_ate timestamptz default null,
	p_limite int default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
	v_ate timestamptz := coalesce(p_ate, now());
	v_de timestamptz := coalesce(p_de, coalesce(p_ate, now()) - interval '30 days');
	v_limite int := least(greatest(coalesce(p_limite, 20), 1), 200);
begin
	perform public.exigir_admin();

	return jsonb_build_object(
		'avgActiveSeconds', (
			select coalesce(avg(s.active_seconds), 0)::float8 from public.telemetry_sessions s where s.started_at between v_de and v_ate
		),
		'totalSessions', (select count(*) from public.telemetry_sessions s where s.started_at between v_de and v_ate),
		'ranking', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'label', case
						when r.anonimo then 'Anônimo ' || left(coalesce(r.anonymous_id, ''), 8)
						when coalesce(trim(r.nome), '') = '' then 'Usuário'
						else r.nome
					end,
					'anonymous', r.anonimo,
					'totalActiveSeconds', r.total_segundos,
					'sessionCount', r.sessoes
				)
				order by r.total_segundos desc
			)
			from (
				select p.name as nome,
					min(s.anonymous_id) as anonymous_id,
					bool_or(s.user_id is null) as anonimo,
					sum(s.active_seconds) as total_segundos,
					count(*) as sessoes
				from public.telemetry_sessions s
				left join public.profiles p on p.id = s.user_id
				where s.started_at between v_de and v_ate
				group by coalesce(s.user_id::text, s.anonymous_id), p.name
				order by total_segundos desc
				limit v_limite
			) r
		), '[]'::jsonb)
	);
end;
$$;

create or replace function public.telemetria_itens_mais_vistos(
	p_de timestamptz default null,
	p_ate timestamptz default null,
	p_limite int default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
	v_ate timestamptz := coalesce(p_ate, now());
	v_de timestamptz := coalesce(p_de, coalesce(p_ate, now()) - interval '30 days');
	v_limite int := least(greatest(coalesce(p_limite, 10), 1), 200);
begin
	perform public.exigir_admin();

	return coalesce((
		select jsonb_agg(jsonb_build_object('menuItemId', t.id, 'name', t.name, 'views', t.views) order by t.views desc, t.name)
		from (
			select m.id, m.name, count(*) as views
			from public.item_view_events e
			join public.menu_items m on m.id = e.menu_item_id
			where e.created_at between v_de and v_ate
			group by m.id, m.name
			order by views desc, m.name
			limit v_limite
		) t
	), '[]'::jsonb);
end;
$$;

revoke all on function public.telemetria_online() from public, anon, authenticated;
revoke all on function public.telemetria_logins(timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.telemetria_acessos_menu(timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.telemetria_sessoes(timestamptz, timestamptz, int) from public, anon, authenticated;
revoke all on function public.telemetria_itens_mais_vistos(timestamptz, timestamptz, int) from public, anon, authenticated;

grant execute on function public.telemetria_online() to authenticated;
grant execute on function public.telemetria_logins(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.telemetria_acessos_menu(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.telemetria_sessoes(timestamptz, timestamptz, int) to authenticated;
grant execute on function public.telemetria_itens_mais_vistos(timestamptz, timestamptz, int) to authenticated;
