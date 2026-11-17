-- Storage: buckets públicos e policies de escrita (cardápio só admin; foto só na própria pasta).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
	('00000000-0000-0000-0000-000000000000', '88888888-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'a@storage.test', '', '{"provider":"email"}', '{}', now(), now()),
	('00000000-0000-0000-0000-000000000000', '88888888-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'admin@storage.test', '', '{"provider":"email"}', '{}', now(), now());
update public.profiles set role = 'admin' where id = '88888888-0000-4000-8000-000000000002';

select results_eq(
	$$ select id, public from storage.buckets where id in ('cardapio', 'fotos-perfil') order by id $$,
	$$ values ('cardapio'::text, true), ('fotos-perfil'::text, true) $$,
	'buckets públicos criados'
);

set local role anon;
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('cardapio', 'anon.png') $$, '42501', null, 'anon não envia imagem do cardápio');

set local role authenticated;
set local request.jwt.claims = '{"sub":"88888888-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('cardapio', 'cliente.png') $$, '42501', null, 'cliente não envia imagem do cardápio');
select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id) values ('fotos-perfil', '88888888-0000-4000-8000-000000000001/foto.png', '88888888-0000-4000-8000-000000000001') $$, 'cliente envia a própria foto');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('fotos-perfil', '88888888-0000-4000-8000-000000000002/foto.png') $$, '42501', null, 'cliente não envia foto na pasta de outro');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('fotos-perfil', 'foto-solta.png') $$, '42501', null, 'foto fora de pasta é recusada');

set local request.jwt.claims = '{"sub":"88888888-0000-4000-8000-000000000002","role":"authenticated"}';
-- A API do Storage libera o DELETE com esta flag; aqui simulamos o mesmo para testar só as policies.
set local storage.allow_delete_query = 'true';
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('cardapio', 'itens/teste.png') $$, 'admin envia imagem do cardápio');
select lives_ok($$ delete from storage.objects where bucket_id = 'fotos-perfil' $$, 'delete do admin em fotos alheias não falha...');

reset role;
select is((select count(*)::int from storage.objects where bucket_id = 'fotos-perfil' and name like '88888888-0000-4000-8000-000000000001/%'), 1, '...mas não remove a foto de outro usuário');

set local role authenticated;
set local request.jwt.claims = '{"sub":"88888888-0000-4000-8000-000000000002","role":"authenticated"}';
select lives_ok($$ delete from storage.objects where bucket_id = 'cardapio' and name = 'itens/teste.png' $$, 'admin remove imagem do cardápio');

select * from finish();
rollback;
