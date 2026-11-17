-- Carrinho e favoritos por usuário. Cada usuário só enxerga e altera as próprias linhas (RLS).
-- O total do carrinho é sempre calculado pelo preço ATUAL do item (join com menu_items), nunca por snapshot.

create table public.cart_items (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
	menu_item_id uuid not null references public.menu_items (id) on delete cascade,
	quantity int not null check (quantity > 0),
	added_at timestamptz not null default now(),
	constraint uq_cart_items_user_item unique (user_id, menu_item_id)
);

create index idx_cart_items_user_id on public.cart_items (user_id, added_at desc);

create table public.favorites (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
	menu_item_id uuid not null references public.menu_items (id) on delete cascade,
	created_at timestamptz not null default now(),
	constraint uq_favorites_user_item unique (user_id, menu_item_id)
);

create index idx_favorites_user_id on public.favorites (user_id, created_at);

alter table public.cart_items enable row level security;
alter table public.favorites enable row level security;

revoke all on table public.cart_items, public.favorites from anon, authenticated;
grant select, insert, update, delete on table public.cart_items to authenticated;
grant select, insert, delete on table public.favorites to authenticated;

create policy cart_items_select_proprio on public.cart_items
for select to authenticated using (user_id = (select auth.uid()));
create policy cart_items_insert_proprio on public.cart_items
for insert to authenticated with check (user_id = (select auth.uid()));
create policy cart_items_update_proprio on public.cart_items
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy cart_items_delete_proprio on public.cart_items
for delete to authenticated using (user_id = (select auth.uid()));

create policy favorites_select_proprio on public.favorites
for select to authenticated using (user_id = (select auth.uid()));
create policy favorites_insert_proprio on public.favorites
for insert to authenticated with check (user_id = (select auth.uid()));
create policy favorites_delete_proprio on public.favorites
for delete to authenticated using (user_id = (select auth.uid()));

-- Item INDISPONIVEL não pode entrar no carrinho (nem ter a quantidade aumentada).
create or replace function public.validar_item_carrinho()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	if tg_op = 'UPDATE' and new.quantity <= old.quantity and new.menu_item_id = old.menu_item_id then
		return new;
	end if;

	if exists (select 1 from public.menu_items m where m.id = new.menu_item_id and m.status = 'INDISPONIVEL') then
		raise exception 'Este item está indisponível no momento.' using errcode = '22023';
	end if;

	return new;
end;
$$;

revoke all on function public.validar_item_carrinho() from public, anon, authenticated;

create trigger trg_cart_items_validar_item
before insert or update on public.cart_items
for each row execute function public.validar_item_carrinho();

-- Adiciona ao carrinho somando à quantidade existente (upsert). Roda com as permissões do usuário (RLS).
create or replace function public.adicionar_ao_carrinho(p_menu_item_id uuid, p_quantidade int default 1)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
	v_uid uuid := (select auth.uid());
	v_quantidade int := coalesce(p_quantidade, 1);
begin
	if v_uid is null then
		raise exception 'Usuário não autenticado.' using errcode = '42501';
	end if;
	if v_quantidade <= 0 then
		raise exception 'Quantidade deve ser maior que zero.' using errcode = '22023';
	end if;
	if not exists (select 1 from public.menu_items m where m.id = p_menu_item_id) then
		raise exception 'Item de cardápio não encontrado.' using errcode = 'P0002';
	end if;

	insert into public.cart_items (user_id, menu_item_id, quantity)
	values (v_uid, p_menu_item_id, v_quantidade)
	on conflict (user_id, menu_item_id) do update set quantity = public.cart_items.quantity + excluded.quantity;
end;
$$;

revoke all on function public.adicionar_ao_carrinho(uuid, int) from public, anon, authenticated;
grant execute on function public.adicionar_ao_carrinho(uuid, int) to authenticated;
