-- Chat de suporte cliente <-> administradores. Uma conversa (thread) por cliente, identificada pelo id dele.
-- Leitura via RLS (dono ou admin) + Supabase Realtime; escrita só pelas RPCs abaixo.

create table public.chat_threads (
	user_id uuid primary key references public.profiles (id) on delete cascade,
	last_message text,
	updated_at timestamptz not null default now(),
	admin_unread_count int not null default 0 check (admin_unread_count >= 0),
	user_unread_count int not null default 0 check (user_unread_count >= 0)
);

create index idx_chat_threads_updated_at on public.chat_threads (updated_at desc);

create table public.chat_messages (
	id uuid primary key default gen_random_uuid(),
	thread_user_id uuid not null references public.chat_threads (user_id) on delete cascade,
	sender_id uuid not null references public.profiles (id) on delete cascade,
	text text not null check (trim(text) <> ''),
	is_admin boolean not null default false,
	sent_at timestamptz not null default now()
);

create index idx_chat_messages_thread_sent_at on public.chat_messages (thread_user_id, sent_at desc);

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

revoke all on table public.chat_threads, public.chat_messages from anon, authenticated;
grant select on table public.chat_threads, public.chat_messages to authenticated;

create policy chat_threads_select_dono_ou_admin on public.chat_threads
for select to authenticated using (user_id = (select auth.uid()) or (select public.eh_admin()));

create policy chat_messages_select_dono_ou_admin on public.chat_messages
for select to authenticated using (thread_user_id = (select auth.uid()) or (select public.eh_admin()));

-- Envia uma mensagem: cria a conversa se faltar, grava a mensagem e atualiza o resumo/contadores.
create or replace function public.enviar_mensagem_chat(p_thread_user_id uuid, p_texto text)
returns public.chat_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_uid uuid := (select auth.uid());
	v_admin boolean := public.eh_admin();
	v_texto text := trim(coalesce(p_texto, ''));
	v_mensagem public.chat_messages;
begin
	if v_uid is null then
		raise exception 'Usuário não autenticado.' using errcode = '42501';
	end if;
	if not v_admin and v_uid is distinct from p_thread_user_id then
		raise exception 'Você não tem acesso a essa conversa.' using errcode = '42501';
	end if;
	if v_texto = '' then
		raise exception 'Mensagem não pode estar vazia' using errcode = '22023';
	end if;
	if not exists (select 1 from public.profiles p where p.id = p_thread_user_id) then
		raise exception 'Usuário não encontrado.' using errcode = 'P0002';
	end if;

	insert into public.chat_threads (user_id) values (p_thread_user_id) on conflict (user_id) do nothing;

	insert into public.chat_messages (thread_user_id, sender_id, text, is_admin)
	values (p_thread_user_id, v_uid, v_texto, v_admin)
	returning * into v_mensagem;

	update public.chat_threads
	set last_message = v_texto,
		updated_at = v_mensagem.sent_at,
		user_unread_count = user_unread_count + case when v_admin then 1 else 0 end,
		admin_unread_count = admin_unread_count + case when v_admin then 0 else 1 end
	where user_id = p_thread_user_id;

	return v_mensagem;
end;
$$;

revoke all on function public.enviar_mensagem_chat(uuid, text) from public, anon, authenticated;
grant execute on function public.enviar_mensagem_chat(uuid, text) to authenticated;

-- Zera o contador de não lidas do lado de quem está lendo ('admin' ou 'user').
create or replace function public.marcar_chat_lido(p_thread_user_id uuid, p_como text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_uid uuid := (select auth.uid());
	v_como_admin boolean := lower(coalesce(p_como, '')) = 'admin';
begin
	if v_uid is null then
		raise exception 'Usuário não autenticado.' using errcode = '42501';
	end if;
	if v_como_admin and not public.eh_admin() then
		raise exception 'Apenas administradores podem marcar como lido nesse modo.' using errcode = '42501';
	end if;
	if not v_como_admin and v_uid is distinct from p_thread_user_id then
		raise exception 'Você só pode marcar como lida a sua própria conversa.' using errcode = '42501';
	end if;

	if v_como_admin then
		update public.chat_threads set admin_unread_count = 0 where user_id = p_thread_user_id;
	else
		update public.chat_threads set user_unread_count = 0 where user_id = p_thread_user_id;
	end if;

	if not found then
		raise exception 'Conversa não encontrada.' using errcode = 'P0002';
	end if;
end;
$$;

revoke all on function public.marcar_chat_lido(uuid, text) from public, anon, authenticated;
grant execute on function public.marcar_chat_lido(uuid, text) to authenticated;

-- Tempo real: o Realtime aplica o RLS acima a cada assinante.
alter publication supabase_realtime add table public.chat_messages, public.chat_threads;
