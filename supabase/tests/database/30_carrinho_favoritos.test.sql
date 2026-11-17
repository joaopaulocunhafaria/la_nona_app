-- Carrinho e favoritos: isolamento por usuário, item indisponível e upsert somando quantidade.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
	('00000000-0000-0000-0000-000000000000', 'eeeeeeee-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'a@carrinho.test', '', '{"provider":"email"}', '{}', now(), now()),
	('00000000-0000-0000-0000-000000000000', 'eeeeeeee-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'b@carrinho.test', '', '{"provider":"email"}', '{}', now(), now());
insert into public.menu_categories (id, name) values ('cccccccc-0000-4000-8000-000000000030', 'Categoria Carrinho');
insert into public.menu_items (id, name, description, price, category_id, status) values
	('dddddddd-0000-4000-8000-000000000031', 'Disponível', 'D', 10.00, 'cccccccc-0000-4000-8000-000000000030', 'DISPONIVEL'),
	('dddddddd-0000-4000-8000-000000000032', 'Feito na hora', 'D', 5.50, 'cccccccc-0000-4000-8000-000000000030', 'FEITO_NA_HORA'),
	('dddddddd-0000-4000-8000-000000000033', 'Indisponível', 'D', 7.00, 'cccccccc-0000-4000-8000-000000000030', 'INDISPONIVEL');

set local role anon;
select throws_ok($$ select count(*) from public.cart_items $$, '42501', null, 'anon não acessa o carrinho');
select throws_ok($$ select public.adicionar_ao_carrinho('dddddddd-0000-4000-8000-000000000031') $$, '42501', null, 'anon não adiciona ao carrinho');

set local role authenticated;
set local request.jwt.claims = '{"sub":"eeeeeeee-0000-4000-8000-000000000001","role":"authenticated"}';

select throws_ok($$ select public.adicionar_ao_carrinho('dddddddd-0000-4000-8000-000000000031', 0) $$, '22023', 'Quantidade deve ser maior que zero.', 'quantidade zero');
select throws_ok($$ select public.adicionar_ao_carrinho('dddddddd-0000-4000-8000-000000000031', -1) $$, '22023', 'Quantidade deve ser maior que zero.', 'quantidade negativa');
select throws_ok($$ select public.adicionar_ao_carrinho('dddddddd-0000-4000-8000-000000000999') $$, 'P0002', 'Item de cardápio não encontrado.', 'item inexistente');
select throws_ok($$ select public.adicionar_ao_carrinho('dddddddd-0000-4000-8000-000000000033') $$, '22023', 'Este item está indisponível no momento.', 'item indisponível');

select lives_ok($$ select public.adicionar_ao_carrinho('dddddddd-0000-4000-8000-000000000031') $$, 'adiciona 1 (padrão)');
select lives_ok($$ select public.adicionar_ao_carrinho('dddddddd-0000-4000-8000-000000000031', 2) $$, 'adiciona mais 2 do mesmo item');
select is((select quantity from public.cart_items where menu_item_id = 'dddddddd-0000-4000-8000-000000000031'), 3, 'upsert soma a quantidade');
select lives_ok($$ select public.adicionar_ao_carrinho('dddddddd-0000-4000-8000-000000000032', 1) $$, 'item FEITO_NA_HORA pode ser pedido');

select throws_ok($$ update public.cart_items set quantity = 0 where menu_item_id = 'dddddddd-0000-4000-8000-000000000031' $$, '23514', null, 'quantidade zero na atualização é recusada');

-- Item que ficou indisponível depois: diminuir pode, aumentar não.
reset role;
update public.menu_items set status = 'INDISPONIVEL' where id = 'dddddddd-0000-4000-8000-000000000032';
set local role authenticated;
select throws_ok($$ update public.cart_items set quantity = 5 where menu_item_id = 'dddddddd-0000-4000-8000-000000000032' $$, '22023', 'Este item está indisponível no momento.', 'não aumenta item que ficou indisponível');
select lives_ok($$ delete from public.cart_items where menu_item_id = 'dddddddd-0000-4000-8000-000000000032' $$, 'remove item que ficou indisponível');

select lives_ok($$ insert into public.favorites (menu_item_id) values ('dddddddd-0000-4000-8000-000000000031') $$, 'favorita (user_id padrão = auth.uid())');
select throws_ok($$ insert into public.favorites (menu_item_id) values ('dddddddd-0000-4000-8000-000000000031') $$, '23505', null, 'favorito duplicado é recusado');
select throws_ok($$ insert into public.favorites (user_id, menu_item_id) values ('eeeeeeee-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000032') $$, '42501', null, 'não favorita em nome de outro usuário');

-- ---------- Isolamento ----------
set local request.jwt.claims = '{"sub":"eeeeeeee-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select count(*)::int from public.cart_items), 0, 'outro usuário não vê o carrinho alheio');
select is((select count(*)::int from public.favorites), 0, 'outro usuário não vê favoritos alheios');
select lives_ok($$ delete from public.cart_items $$, 'delete alheio não falha...');

set local request.jwt.claims = '{"sub":"eeeeeeee-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select count(*)::int from public.cart_items), 1, '...e não remove o carrinho do dono');

select * from finish();
rollback;
