-- Cardápio: categorias dinâmicas, itens (com status) e imagens (arquivos no bucket `cardapio`).
-- Leitura pública (anon); escrita só para administradores.

create table public.menu_categories (
	id uuid primary key default gen_random_uuid(),
	name varchar(60) not null check (name = trim(name) and name <> ''),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create unique index uq_menu_categories_name on public.menu_categories (lower(name));

create trigger trg_menu_categories_updated_at
before update on public.menu_categories
for each row execute function public.atualizar_updated_at();

-- Categorias padrão (também em produção).
insert into public.menu_categories (name) values
	('Hamburguer'), ('Pizza'), ('Salada'), ('Bebida'), ('Sobremesa'), ('Acompanhamento'), ('Outro');

create table public.menu_items (
	id uuid primary key default gen_random_uuid(),
	name varchar(255) not null check (trim(name) <> ''),
	description text not null check (trim(description) <> ''),
	price numeric(10, 2) not null check (price > 0),
	category_id uuid not null references public.menu_categories (id) on delete restrict,
	status varchar(30) not null default 'DISPONIVEL'
		check (status in ('DISPONIVEL', 'FEITO_NA_HORA', 'VERIFICAR_DISPONIBILIDADE', 'INDISPONIVEL')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on column public.menu_items.status is 'Todos os estados, exceto INDISPONIVEL, permitem adicionar o item ao carrinho.';

create index idx_menu_items_category_id on public.menu_items (category_id);
create index idx_menu_items_status on public.menu_items (status);
create index idx_menu_items_name on public.menu_items (lower(name));

create trigger trg_menu_items_updated_at
before update on public.menu_items
for each row execute function public.atualizar_updated_at();

create table public.menu_item_images (
	id uuid primary key default gen_random_uuid(),
	menu_item_id uuid not null references public.menu_items (id) on delete cascade,
	url text not null check (trim(url) <> ''),
	-- Caminho do objeto no bucket `cardapio` (null para URLs externas).
	storage_path text,
	position int not null default 0 check (position >= 0),
	created_at timestamptz not null default now()
);

create index idx_menu_item_images_menu_item_id on public.menu_item_images (menu_item_id, position);

alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_item_images enable row level security;

revoke all on table public.menu_categories, public.menu_items, public.menu_item_images from anon, authenticated;
grant select on table public.menu_categories, public.menu_items, public.menu_item_images to anon, authenticated;
grant insert, update, delete on table public.menu_categories to authenticated;
grant delete on table public.menu_items to authenticated;

create policy menu_categories_select_publico on public.menu_categories
for select to anon, authenticated using (true);

create policy menu_categories_insert_admin on public.menu_categories
for insert to authenticated with check ((select public.eh_admin()));

create policy menu_categories_update_admin on public.menu_categories
for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy menu_categories_delete_admin on public.menu_categories
for delete to authenticated using ((select public.eh_admin()));

create policy menu_items_select_publico on public.menu_items
for select to anon, authenticated using (true);

create policy menu_items_delete_admin on public.menu_items
for delete to authenticated using ((select public.eh_admin()));

create policy menu_item_images_select_publico on public.menu_item_images
for select to anon, authenticated using (true);

-- Cria ou atualiza um item e substitui as imagens numa única transação.
-- p_dados: { name, description, price, category_id, status }
-- p_imagens: [ { url, storage_path } ] na ordem de exibição.
create or replace function public.salvar_item_cardapio(p_id uuid, p_dados jsonb, p_imagens jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_id uuid := p_id;
	v_nome text := trim(coalesce(p_dados ->> 'name', ''));
	v_descricao text := trim(coalesce(p_dados ->> 'description', ''));
	v_preco_texto text := nullif(trim(coalesce(p_dados ->> 'price', '')), '');
	v_preco numeric(10, 2);
	v_categoria_texto text := nullif(trim(coalesce(p_dados ->> 'category_id', '')), '');
	v_categoria uuid;
	v_status text := coalesce(nullif(trim(coalesce(p_dados ->> 'status', '')), ''), 'DISPONIVEL');
begin
	if not public.eh_admin() then
		raise exception 'Acesso restrito a administradores.' using errcode = '42501';
	end if;

	if v_nome = '' then
		raise exception 'Nome é obrigatório' using errcode = '22023';
	end if;
	if v_descricao = '' then
		raise exception 'Descrição é obrigatória' using errcode = '22023';
	end if;

	if v_preco_texto is null then
		raise exception 'Preço é obrigatório' using errcode = '22023';
	end if;
	begin
		v_preco := v_preco_texto::numeric(10, 2);
	exception when others then
		raise exception 'Preço deve ser um número válido maior que 0' using errcode = '22023';
	end;
	if v_preco <= 0 then
		raise exception 'Preço deve ser um número válido maior que 0' using errcode = '22023';
	end if;

	if v_categoria_texto is null then
		raise exception 'Selecione uma categoria' using errcode = '22023';
	end if;
	begin
		v_categoria := v_categoria_texto::uuid;
	exception when others then
		raise exception 'Categoria não encontrada.' using errcode = '22023';
	end;
	if not exists (select 1 from public.menu_categories c where c.id = v_categoria) then
		raise exception 'Categoria não encontrada.' using errcode = '22023';
	end if;

	if v_status not in ('DISPONIVEL', 'FEITO_NA_HORA', 'VERIFICAR_DISPONIBILIDADE', 'INDISPONIVEL') then
		raise exception 'Situação do item inválida.' using errcode = '22023';
	end if;

	if p_imagens is null or jsonb_typeof(p_imagens) <> 'array' or jsonb_array_length(p_imagens) = 0 then
		raise exception 'Adicione pelo menos uma imagem' using errcode = '22023';
	end if;
	if exists (
		select 1 from jsonb_array_elements(p_imagens) e where nullif(trim(coalesce(e ->> 'url', '')), '') is null
	) then
		raise exception 'Imagem inválida: conteúdo vazio.' using errcode = '22023';
	end if;

	if v_id is null then
		insert into public.menu_items (name, description, price, category_id, status)
		values (v_nome, v_descricao, v_preco, v_categoria, v_status)
		returning id into v_id;
	else
		update public.menu_items
		set name = v_nome, description = v_descricao, price = v_preco, category_id = v_categoria, status = v_status
		where id = v_id;

		if not found then
			raise exception 'Item de cardápio não encontrado.' using errcode = 'P0002';
		end if;

		delete from public.menu_item_images where menu_item_id = v_id;
	end if;

	insert into public.menu_item_images (menu_item_id, url, storage_path, position)
	select v_id, trim(e.valor ->> 'url'), nullif(trim(coalesce(e.valor ->> 'storage_path', '')), ''), (e.ordem - 1)::int
	from jsonb_array_elements(p_imagens) with ordinality as e (valor, ordem);

	return v_id;
end;
$$;

revoke all on function public.salvar_item_cardapio(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.salvar_item_cardapio(uuid, jsonb, jsonb) to authenticated;
