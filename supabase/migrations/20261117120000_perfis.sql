-- Perfis de usuário (1:1 com auth.users), papel (cliente/entregador/admin) e endereço de entrega.
-- Substitui a tabela `users` do antigo backend Spring Boot. Senha e sessão ficam no Supabase Auth.

-- Mantém updated_at em dia em qualquer tabela que tenha a coluna.
create or replace function public.atualizar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at := now();
	return new;
end;
$$;

revoke all on function public.atualizar_updated_at() from public, anon, authenticated;

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	email varchar(255) not null,
	name varchar(255) not null default '',
	photo text,
	provider varchar(20) not null default 'local' check (provider in ('local', 'google')),
	role varchar(20) not null default 'cliente' check (role in ('cliente', 'entregador', 'admin')),
	onboarding_completed boolean not null default false,
	address_cep varchar(9),
	address_rua varchar(255),
	address_bairro varchar(255),
	address_numero varchar(10),
	address_cidade varchar(255),
	address_estado varchar(2),
	address_complemento varchar(60),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil do usuário autenticado. role = admin libera as áreas administrativas.';

create index idx_profiles_name on public.profiles (lower(name));

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.atualizar_updated_at();

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

-- Indica se o usuário da requisição é administrador. Lê a tabela (não o JWT), então
-- uma promoção de cargo vale imediatamente, sem novo login.
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
	);
$$;

revoke all on function public.eh_admin() from public, anon, authenticated;
grant execute on function public.eh_admin() to anon, authenticated;

create policy profiles_select_proprio_ou_admin on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select public.eh_admin()));

-- Cria o perfil assim que o usuário se cadastra no Supabase Auth.
create or replace function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	insert into public.profiles (id, email, name, provider)
	values (
		new.id,
		lower(coalesce(new.email, '')),
		coalesce(trim(new.raw_user_meta_data ->> 'name'), ''),
		case when new.raw_app_meta_data ->> 'provider' = 'google' then 'google' else 'local' end
	);
	return new;
end;
$$;

revoke all on function public.criar_perfil_novo_usuario() from public, anon, authenticated;

create trigger trg_auth_users_criar_perfil
after insert on auth.users
for each row execute function public.criar_perfil_novo_usuario();

-- Endereço de entrega (onboarding obrigatório). Mesmas regras do antigo UserService.saveAddress.
create or replace function public.salvar_endereco(
	p_cep text,
	p_rua text,
	p_bairro text,
	p_numero text,
	p_cidade text,
	p_estado text,
	p_complemento text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_uid uuid := (select auth.uid());
	v_cep text := regexp_replace(coalesce(p_cep, ''), '\D', '', 'g');
	v_rua text := trim(coalesce(p_rua, ''));
	v_bairro text := trim(coalesce(p_bairro, ''));
	v_numero text := trim(coalesce(p_numero, ''));
	v_cidade text := trim(coalesce(p_cidade, ''));
	v_estado text := upper(trim(coalesce(p_estado, '')));
	v_complemento text := trim(coalesce(p_complemento, ''));
	v_perfil public.profiles;
begin
	if v_uid is null then
		raise exception 'Usuário não autenticado.' using errcode = '42501';
	end if;

	if v_cep = '' then
		raise exception 'CEP obrigatório.' using errcode = '22023';
	end if;
	if v_cep !~ '^\d{8}$' then
		raise exception 'CEP inválido. Use 8 dígitos.' using errcode = '22023';
	end if;

	if v_rua = '' then
		raise exception 'Rua: campo obrigatório.' using errcode = '22023';
	end if;
	if char_length(v_rua) < 3 then
		raise exception 'Rua: mínimo de 3 caracteres.' using errcode = '22023';
	end if;

	if v_bairro = '' then
		raise exception 'Bairro: campo obrigatório.' using errcode = '22023';
	end if;
	if char_length(v_bairro) < 2 then
		raise exception 'Bairro: mínimo de 2 caracteres.' using errcode = '22023';
	end if;

	if v_cidade = '' then
		raise exception 'Cidade: campo obrigatório.' using errcode = '22023';
	end if;
	if char_length(v_cidade) < 2 then
		raise exception 'Cidade: mínimo de 2 caracteres.' using errcode = '22023';
	end if;

	if v_numero = '' then
		raise exception 'Número: campo obrigatório.' using errcode = '22023';
	end if;
	if v_numero !~ '^[0-9A-Za-z/-]{1,10}$' then
		raise exception 'Número inválido.' using errcode = '22023';
	end if;

	if v_estado = '' then
		raise exception 'UF: campo obrigatório.' using errcode = '22023';
	end if;
	if v_estado <> all (array[
		'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
		'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
	]) then
		raise exception 'UF inválida.' using errcode = '22023';
	end if;

	if char_length(v_complemento) > 60 then
		raise exception 'Complemento: máximo de 60 caracteres.' using errcode = '22023';
	end if;

	update public.profiles
	set address_cep = substr(v_cep, 1, 5) || '-' || substr(v_cep, 6),
		address_rua = v_rua,
		address_bairro = v_bairro,
		address_numero = v_numero,
		address_cidade = v_cidade,
		address_estado = v_estado,
		address_complemento = v_complemento,
		onboarding_completed = true
	where id = v_uid
	returning * into v_perfil;

	if v_perfil.id is null then
		raise exception 'Usuário não encontrado.' using errcode = 'P0002';
	end if;

	return v_perfil;
end;
$$;

revoke all on function public.salvar_endereco(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.salvar_endereco(text, text, text, text, text, text, text) to authenticated;

-- Foto de perfil: o arquivo vai para o bucket `fotos-perfil`; aqui só a URL pública.
create or replace function public.atualizar_foto(p_url text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_uid uuid := (select auth.uid());
	v_perfil public.profiles;
begin
	if v_uid is null then
		raise exception 'Usuário não autenticado.' using errcode = '42501';
	end if;
	if nullif(trim(coalesce(p_url, '')), '') is null then
		raise exception 'Imagem inválida: conteúdo vazio.' using errcode = '22023';
	end if;

	update public.profiles set photo = trim(p_url) where id = v_uid returning * into v_perfil;

	if v_perfil.id is null then
		raise exception 'Usuário não encontrado.' using errcode = 'P0002';
	end if;

	return v_perfil;
end;
$$;

revoke all on function public.atualizar_foto(text) from public, anon, authenticated;
grant execute on function public.atualizar_foto(text) to authenticated;

-- Gestão de usuários (área administrativa).
create or replace function public.admin_buscar_usuarios(p_busca text default null)
returns setof public.profiles
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
	v_termo text := nullif(trim(coalesce(p_busca, '')), '');
	v_padrao text;
begin
	if not public.eh_admin() then
		raise exception 'Acesso restrito a administradores.' using errcode = '42501';
	end if;

	if v_termo is null then
		return query select * from public.profiles p order by lower(p.name), p.email;
		return;
	end if;

	-- Escapa os curingas do LIKE para que '%' e '_' digitados sejam buscados literalmente.
	v_padrao := '%' || replace(replace(replace(v_termo, '\', '\\'), '%', '\%'), '_', '\_') || '%';

	return query
	select * from public.profiles p
	where p.name ilike v_padrao or p.email ilike v_padrao
	order by lower(p.name), p.email;
end;
$$;

revoke all on function public.admin_buscar_usuarios(text) from public, anon, authenticated;
grant execute on function public.admin_buscar_usuarios(text) to authenticated;

create or replace function public.admin_alterar_cargo(p_id uuid, p_role text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_role text := lower(trim(coalesce(p_role, '')));
	v_perfil public.profiles;
begin
	if not public.eh_admin() then
		raise exception 'Acesso restrito a administradores.' using errcode = '42501';
	end if;
	if v_role not in ('cliente', 'entregador', 'admin') then
		raise exception 'Cargo inválido. Use: cliente, entregador ou admin.' using errcode = '22023';
	end if;

	update public.profiles set role = v_role where id = p_id returning * into v_perfil;

	if v_perfil.id is null then
		raise exception 'Usuário não encontrado.' using errcode = 'P0002';
	end if;

	return v_perfil;
end;
$$;

revoke all on function public.admin_alterar_cargo(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_alterar_cargo(uuid, text) to authenticated;
