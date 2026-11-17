-- Chat: acesso só do dono ou admin, contadores de não lidas e marcar como lido.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
	('00000000-0000-0000-0000-000000000000', 'ffffffff-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'a@chat.test', '', '{"provider":"email"}', '{"name":"Cliente Chat"}', now(), now()),
	('00000000-0000-0000-0000-000000000000', 'ffffffff-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'b@chat.test', '', '{"provider":"email"}', '{}', now(), now()),
	('00000000-0000-0000-0000-000000000000', 'ffffffff-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'admin@chat.test', '', '{"provider":"email"}', '{}', now(), now());
update public.profiles set role = 'admin' where id = 'ffffffff-0000-4000-8000-000000000003';

select ok(
	exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('chat_messages', 'chat_threads')),
	'tabelas do chat publicadas no Realtime'
);

set local role anon;
select throws_ok($$ select public.enviar_mensagem_chat('ffffffff-0000-4000-8000-000000000001', 'Oi') $$, '42501', null, 'anon não envia mensagem');

set local role authenticated;
set local request.jwt.claims = '{"sub":"ffffffff-0000-4000-8000-000000000001","role":"authenticated"}';

select throws_ok($$ select public.enviar_mensagem_chat('ffffffff-0000-4000-8000-000000000001', '   ') $$, '22023', 'Mensagem não pode estar vazia', 'mensagem só com espaços');
select throws_ok($$ select public.enviar_mensagem_chat('ffffffff-0000-4000-8000-000000000002', 'Oi') $$, '42501', 'Você não tem acesso a essa conversa.', 'cliente não escreve na conversa de outro');
select throws_ok($$ select public.marcar_chat_lido('ffffffff-0000-4000-8000-000000000001', 'user') $$, 'P0002', 'Conversa não encontrada.', 'marcar lida sem conversa');

select is((select text from public.enviar_mensagem_chat('ffffffff-0000-4000-8000-000000000001', '  Olá, preciso de ajuda  ')), 'Olá, preciso de ajuda', 'primeira mensagem cria a conversa (texto aparado)');
select lives_ok($$ select public.enviar_mensagem_chat('ffffffff-0000-4000-8000-000000000001', 'Segunda') $$, 'segunda mensagem');
select results_eq(
	$$ select last_message, admin_unread_count, user_unread_count from public.chat_threads where user_id = 'ffffffff-0000-4000-8000-000000000001' $$,
	$$ values ('Segunda'::text, 2, 0) $$,
	'resumo e contador do admin atualizados'
);
select is((select bool_or(is_admin) from public.chat_messages), false, 'mensagens do cliente não são de admin');
select throws_ok($$ insert into public.chat_messages (thread_user_id, sender_id, text) values ('ffffffff-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'direto') $$, '42501', null, 'insert direto é bloqueado');
select throws_ok($$ select public.marcar_chat_lido('ffffffff-0000-4000-8000-000000000001', 'admin') $$, '42501', 'Apenas administradores podem marcar como lido nesse modo.', 'cliente não marca como admin');

set local request.jwt.claims = '{"sub":"ffffffff-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select count(*)::int from public.chat_messages), 0, 'outro cliente não lê mensagens alheias');
select is((select count(*)::int from public.chat_threads), 0, 'outro cliente não vê conversas alheias');
select throws_ok($$ select public.marcar_chat_lido('ffffffff-0000-4000-8000-000000000001', 'user') $$, '42501', 'Você só pode marcar como lida a sua própria conversa.', 'outro cliente não marca a conversa alheia');

-- ---------- Admin ----------
set local request.jwt.claims = '{"sub":"ffffffff-0000-4000-8000-000000000003","role":"authenticated"}';
select is((select count(*)::int from public.chat_messages where thread_user_id = 'ffffffff-0000-4000-8000-000000000001'), 2, 'admin lê as mensagens');
select is((select is_admin from public.enviar_mensagem_chat('ffffffff-0000-4000-8000-000000000001', 'Como posso ajudar?')), true, 'resposta do admin é marcada como admin');
select results_eq(
	$$ select admin_unread_count, user_unread_count from public.chat_threads where user_id = 'ffffffff-0000-4000-8000-000000000001' $$,
	$$ values (2, 1) $$,
	'resposta do admin incrementa o contador do cliente'
);
select lives_ok($$ select public.marcar_chat_lido('ffffffff-0000-4000-8000-000000000001', 'admin') $$, 'admin marca como lida');
select is((select admin_unread_count from public.chat_threads where user_id = 'ffffffff-0000-4000-8000-000000000001'), 0, 'contador do admin zerado');

set local request.jwt.claims = '{"sub":"ffffffff-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$ select public.marcar_chat_lido('ffffffff-0000-4000-8000-000000000001', 'user') $$, 'cliente marca como lida');
select is((select user_unread_count from public.chat_threads where user_id = 'ffffffff-0000-4000-8000-000000000001'), 0, 'contador do cliente zerado');

select * from finish();
rollback;
