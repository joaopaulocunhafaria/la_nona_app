-- Cardápio: leitura pública, escrita só admin, salvar_item_cardapio transacional e regras de categoria.
begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
	('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'cliente@cardapio.test', '', '{"provider":"email"}', '{}', now(), now()),
	('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'admin@cardapio.test', '', '{"provider":"email"}', '{}', now(), now());
update public.profiles set role = 'admin' where id = 'bbbbbbbb-0000-4000-8000-000000000002';
insert into public.menu_categories (id, name) values ('cccccccc-0000-4000-8000-000000000001', 'Teste Categoria');
insert into public.menu_items (id, name, description, price, category_id)
values ('dddddddd-0000-4000-8000-000000000001', 'Item fixo', 'Desc', 10, 'cccccccc-0000-4000-8000-000000000001');

select is(
	(select count(*)::int from public.menu_categories where name in ('Hamburguer', 'Pizza', 'Salada', 'Bebida', 'Sobremesa', 'Acompanhamento', 'Outro')),
	7, 'migration semeia as 7 categorias padrão'
);
select throws_ok(
	$$ insert into public.menu_items (name, description, price, category_id, status) values ('X', 'Y', 10, 'cccccccc-0000-4000-8000-000000000001', 'ESGOTADO') $$,
	'23514', null, 'status fora da lista é recusado'
);
select throws_ok(
	$$ insert into public.menu_items (name, description, price, category_id) values ('X', 'Y', -1, 'cccccccc-0000-4000-8000-000000000001') $$,
	'23514', null, 'preço negativo é recusado'
);

-- ---------- anon ----------
set local role anon;
select ok((select count(*) from public.menu_items) > 0, 'anon lê itens');
select ok((select count(*) from public.menu_categories) > 0, 'anon lê categorias');
select lives_ok($$ select count(*) from public.menu_item_images $$, 'anon lê imagens');
select throws_ok($$ insert into public.menu_categories (name) values ('Anon') $$, '42501', null, 'anon não cria categoria');
select throws_ok($$ select public.salvar_item_cardapio(null, '{}', '[]') $$, '42501', null, 'anon não executa salvar_item_cardapio');

-- ---------- cliente ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ insert into public.menu_categories (name) values ('Cliente') $$, '42501', null, 'cliente não cria categoria');
select throws_ok(
	$$ select public.salvar_item_cardapio(null, '{"name":"X","description":"Y","price":10,"category_id":"cccccccc-0000-4000-8000-000000000001"}', '[{"url":"https://x/1.png"}]') $$,
	'42501', 'Acesso restrito a administradores.', 'cliente não salva item'
);
select lives_ok($$ delete from public.menu_items where id = 'dddddddd-0000-4000-8000-000000000001' $$, 'delete do cliente não falha...');
select is((select count(*)::int from public.menu_items where id = 'dddddddd-0000-4000-8000-000000000001'), 1, '...mas não remove nada (RLS)');

-- ---------- admin: categorias ----------
set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$ insert into public.menu_categories (name) values ('teste categoria') $$, '23505', null, 'categoria duplicada (ignorando maiúsculas) é recusada');
select throws_ok($$ insert into public.menu_categories (name) values ('   ') $$, '23514', null, 'categoria só com espaços é recusada');
select throws_ok($$ insert into public.menu_categories (name) values (repeat('x', 61)) $$, '22001', null, 'categoria com 61 caracteres é recusada');
select lives_ok($$ insert into public.menu_categories (name) values (repeat('y', 60)) $$, 'categoria com 60 caracteres é aceita');
select throws_ok(
	$$ delete from public.menu_categories where id = 'cccccccc-0000-4000-8000-000000000001' $$,
	'23503', null, 'categoria com itens vinculados não pode ser excluída'
);

-- ---------- admin: salvar_item_cardapio (erros) ----------
select throws_ok($$ select public.salvar_item_cardapio(null, '{"name":"  ","description":"Y","price":10,"category_id":"cccccccc-0000-4000-8000-000000000001"}', '[{"url":"https://x/1.png"}]') $$,
	'22023', 'Nome é obrigatório', 'nome só com espaços');
select throws_ok($$ select public.salvar_item_cardapio(null, '{"name":"X","description":"","price":10,"category_id":"cccccccc-0000-4000-8000-000000000001"}', '[{"url":"https://x/1.png"}]') $$,
	'22023', 'Descrição é obrigatória', 'descrição vazia');
select throws_ok($$ select public.salvar_item_cardapio(null, '{"name":"X","description":"Y","category_id":"cccccccc-0000-4000-8000-000000000001"}', '[{"url":"https://x/1.png"}]') $$,
	'22023', 'Preço é obrigatório', 'sem preço');
select throws_ok($$ select public.salvar_item_cardapio(null, '{"name":"X","description":"Y","price":0,"category_id":"cccccccc-0000-4000-8000-000000000001"}', '[{"url":"https://x/1.png"}]') $$,
	'22023', 'Preço deve ser um número válido maior que 0', 'preço zero');
select throws_ok($$ select public.salvar_item_cardapio(null, '{"name":"X","description":"Y","price":"abc","category_id":"cccccccc-0000-4000-8000-000000000001"}', '[{"url":"https://x/1.png"}]') $$,
	'22023', 'Preço deve ser um número válido maior que 0', 'preço não numérico');
select throws_ok($$ select public.salvar_item_cardapio(null, '{"name":"X","description":"Y","price":10}', '[{"url":"https://x/1.png"}]') $$,
	'22023', 'Selecione uma categoria', 'sem categoria');
select throws_ok($$ select public.salvar_item_cardapio(null, '{"name":"X","description":"Y","price":10,"category_id":"cccccccc-0000-4000-8000-000000000999"}', '[{"url":"https://x/1.png"}]') $$,
	'22023', 'Categoria não encontrada.', 'categoria inexistente');
select throws_ok($$ select public.salvar_item_cardapio(null, '{"name":"X","description":"Y","price":10,"category_id":"cccccccc-0000-4000-8000-000000000001","status":"ESGOTADO"}', '[{"url":"https://x/1.png"}]') $$,
	'22023', 'Situação do item inválida.', 'status inválido');
select throws_ok($$ select public.salvar_item_cardapio(null, '{"name":"X","description":"Y","price":10,"category_id":"cccccccc-0000-4000-8000-000000000001"}', '[]') $$,
	'22023', 'Adicione pelo menos uma imagem', 'sem imagens');
select throws_ok($$ select public.salvar_item_cardapio('dddddddd-0000-4000-8000-000000000999', '{"name":"X","description":"Y","price":10,"category_id":"cccccccc-0000-4000-8000-000000000001"}', '[{"url":"https://x/1.png"}]') $$,
	'P0002', 'Item de cardápio não encontrado.', 'editar item inexistente');

-- ---------- admin: salvar_item_cardapio (sucesso) ----------
select lives_ok($$ select public.salvar_item_cardapio(
		'dddddddd-0000-4000-8000-000000000001',
		'{"name":"  Item editado ","description":"Nova","price":"12.5","category_id":"cccccccc-0000-4000-8000-000000000001","status":"FEITO_NA_HORA"}',
		'[{"url":"https://x/a.png","storage_path":"itens/a.png"},{"url":"https://x/b.png"}]') $$,
	'edita item e define duas imagens');
select results_eq(
	$$ select name, price, status from public.menu_items where id = 'dddddddd-0000-4000-8000-000000000001' $$,
	$$ values ('Item editado'::varchar, 12.50::numeric, 'FEITO_NA_HORA'::varchar) $$,
	'campos gravados (nome aparado, preço numérico, status)'
);
select results_eq(
	$$ select url, storage_path, position from public.menu_item_images where menu_item_id = 'dddddddd-0000-4000-8000-000000000001' order by position $$,
	$$ values ('https://x/a.png'::text, 'itens/a.png'::text, 0), ('https://x/b.png'::text, null::text, 1) $$,
	'imagens na ordem enviada, com storage_path opcional'
);
select lives_ok($$ select public.salvar_item_cardapio(
		'dddddddd-0000-4000-8000-000000000001',
		'{"name":"Item editado","description":"Nova","price":12.5,"category_id":"cccccccc-0000-4000-8000-000000000001"}',
		'[{"url":"https://x/b.png"}]') $$,
	'nova edição substitui as imagens');
select is((select count(*)::int from public.menu_item_images where menu_item_id = 'dddddddd-0000-4000-8000-000000000001'), 1, 'imagens antigas removidas');
select is((select status from public.menu_items where id = 'dddddddd-0000-4000-8000-000000000001'), 'DISPONIVEL', 'sem status volta para DISPONIVEL');
select throws_ok($$ select public.salvar_item_cardapio(
		'dddddddd-0000-4000-8000-000000000001',
		'{"name":"Item editado","description":"Nova","price":12.5,"category_id":"cccccccc-0000-4000-8000-000000000001"}',
		'[{"url":"https://x/c.png"},{"url":"  "}]') $$,
	'22023', 'Imagem inválida: conteúdo vazio.', 'imagem sem URL falha...');
select results_eq($$ select url from public.menu_item_images where menu_item_id = 'dddddddd-0000-4000-8000-000000000001' $$,
	$$ values ('https://x/b.png'::text) $$, '...e não altera as imagens salvas');

select * from finish();
rollback;
