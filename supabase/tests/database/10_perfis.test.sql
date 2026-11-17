-- Perfis: criação automática, endereço (salvar_endereco), foto e gestão de cargos.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
	('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'Cliente.A@Teste.com', '', '{"provider":"email"}', '{"name":"  Cliente A  "}', now(), now()),
	('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'cliente_b@teste.com', '', '{"provider":"email"}', '{}', now(), now()),
	('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'admin@teste.com', '', '{"provider":"google"}', '{"name":"Admin"}', now(), now());
update public.profiles set role = 'admin' where id = 'aaaaaaaa-0000-4000-8000-000000000003';

-- ---------- Trigger de criação ----------
select results_eq(
	$$ select email, name, role, provider, onboarding_completed from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
	$$ values ('cliente.a@teste.com'::varchar, 'Cliente A'::varchar, 'cliente'::varchar, 'local'::varchar, false) $$,
	'cadastro cria perfil com e-mail minúsculo, nome aparado, cargo cliente e onboarding pendente'
);
select is((select name from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000002'), '', 'sem nome no cadastro vira string vazia');
select is((select provider from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000003'), 'google', 'provider google é registrado');

-- ---------- RLS ----------
set local role anon;
select throws_ok($$ select count(*) from public.profiles $$, '42501', null, 'anon não acessa perfis');
select throws_ok($$ select public.salvar_endereco('01001000', 'Rua A', 'Centro', '10', 'São Paulo', 'SP') $$, '42501', null, 'anon não salva endereço');

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select count(*)::int from public.profiles), 1, 'cliente enxerga só o próprio perfil');
select throws_ok($$ update public.profiles set role = 'admin' where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$, '42501', null, 'cliente não altera o perfil diretamente');

-- ---------- salvar_endereco: cada erro ----------
select throws_ok($$ select public.salvar_endereco('   ', 'Rua A', 'Centro', '10', 'São Paulo', 'SP') $$, '22023', 'CEP obrigatório.', 'CEP vazio');
select throws_ok($$ select public.salvar_endereco('0100100', 'Rua A', 'Centro', '10', 'São Paulo', 'SP') $$, '22023', 'CEP inválido. Use 8 dígitos.', 'CEP com 7 dígitos');
select throws_ok($$ select public.salvar_endereco('010010000', 'Rua A', 'Centro', '10', 'São Paulo', 'SP') $$, '22023', 'CEP inválido. Use 8 dígitos.', 'CEP com 9 dígitos');
select throws_ok($$ select public.salvar_endereco('01001000', '  ', 'Centro', '10', 'São Paulo', 'SP') $$, '22023', 'Rua: campo obrigatório.', 'rua só com espaços');
select throws_ok($$ select public.salvar_endereco('01001000', 'Ru', 'Centro', '10', 'São Paulo', 'SP') $$, '22023', 'Rua: mínimo de 3 caracteres.', 'rua curta');
select throws_ok($$ select public.salvar_endereco('01001000', 'Rua A', '', '10', 'São Paulo', 'SP') $$, '22023', 'Bairro: campo obrigatório.', 'bairro vazio');
select throws_ok($$ select public.salvar_endereco('01001000', 'Rua A', 'C', '10', 'São Paulo', 'SP') $$, '22023', 'Bairro: mínimo de 2 caracteres.', 'bairro curto');
select throws_ok($$ select public.salvar_endereco('01001000', 'Rua A', 'Centro', '10', ' ', 'SP') $$, '22023', 'Cidade: campo obrigatório.', 'cidade vazia');
select throws_ok($$ select public.salvar_endereco('01001000', 'Rua A', 'Centro', '10', 'S', 'SP') $$, '22023', 'Cidade: mínimo de 2 caracteres.', 'cidade curta');
select throws_ok($$ select public.salvar_endereco('01001000', 'Rua A', 'Centro', '', 'São Paulo', 'SP') $$, '22023', 'Número: campo obrigatório.', 'número vazio');
select throws_ok($$ select public.salvar_endereco('01001000', 'Rua A', 'Centro', '12 A', 'São Paulo', 'SP') $$, '22023', 'Número inválido.', 'número com espaço');
select throws_ok($$ select public.salvar_endereco('01001000', 'Rua A', 'Centro', '12345678901', 'São Paulo', 'SP') $$, '22023', 'Número inválido.', 'número com 11 caracteres');
select throws_ok($$ select public.salvar_endereco('01001000', 'Rua A', 'Centro', '10', 'São Paulo', '') $$, '22023', 'UF: campo obrigatório.', 'UF vazia');
select throws_ok($$ select public.salvar_endereco('01001000', 'Rua A', 'Centro', '10', 'São Paulo', 'XX') $$, '22023', 'UF inválida.', 'UF inexistente');
select throws_ok($$ select public.salvar_endereco('01001000', 'Rua A', 'Centro', '10', 'São Paulo', 'SP', repeat('x', 61)) $$, '22023', 'Complemento: máximo de 60 caracteres.', 'complemento com 61 caracteres');

-- ---------- salvar_endereco: sucesso ----------
select lives_ok($$ select public.salvar_endereco('01001-000', ' Praça da Sé ', 'Sé', '10/B', 'São Paulo', 'sp', repeat('x', 60)) $$, 'endereço válido (CEP com máscara, UF minúscula, complemento de 60) é aceito');
select results_eq(
	$$ select address_cep, address_rua, address_estado, onboarding_completed from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
	$$ values ('01001-000'::varchar, 'Praça da Sé'::varchar, 'SP'::varchar, true) $$,
	'CEP formatado, campos aparados, UF maiúscula e onboarding concluído'
);

select is((select photo from public.atualizar_foto('https://exemplo.com/f.png')), 'https://exemplo.com/f.png', 'atualizar_foto grava a URL');

-- ---------- Admin ----------
select throws_ok($$ select * from public.admin_buscar_usuarios(null) $$, '42501', null, 'cliente não lista usuários');
select throws_ok($$ select public.admin_alterar_cargo('aaaaaaaa-0000-4000-8000-000000000002', 'admin') $$, '42501', null, 'cliente não altera cargo');

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000003","role":"authenticated"}';
select is((select count(*)::int from public.admin_buscar_usuarios('_b@')), 1, 'busca trata "_" como literal (acha só cliente_b)');
select throws_ok($$ select public.admin_alterar_cargo('aaaaaaaa-0000-4000-8000-000000000002', 'gerente') $$, '22023', 'Cargo inválido. Use: cliente, entregador ou admin.', 'cargo inválido');
select is((select role from public.admin_alterar_cargo('aaaaaaaa-0000-4000-8000-000000000002', ' Entregador ')), 'entregador', 'admin altera cargo (normalizado)');

select * from finish();
rollback;
