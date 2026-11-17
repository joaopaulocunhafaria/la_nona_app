-- Buckets de imagens (substituem o S3 do antigo backend). Leitura pública via URL; o banco guarda só a URL.
--   cardapio      -> imagens dos itens do cardápio (escrita só para administradores)
--   fotos-perfil  -> foto de cada usuário, sempre dentro da pasta "<auth.uid()>/"

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
	('cardapio', 'cardapio', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
	('fotos-perfil', 'fotos-perfil', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy cardapio_insert_admin on storage.objects
for insert to authenticated
with check (bucket_id = 'cardapio' and (select public.eh_admin()));

create policy cardapio_update_admin on storage.objects
for update to authenticated
using (bucket_id = 'cardapio' and (select public.eh_admin()))
with check (bucket_id = 'cardapio' and (select public.eh_admin()));

create policy cardapio_delete_admin on storage.objects
for delete to authenticated
using (bucket_id = 'cardapio' and (select public.eh_admin()));

create policy fotos_perfil_insert_proprio on storage.objects
for insert to authenticated
with check (bucket_id = 'fotos-perfil' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy fotos_perfil_update_proprio on storage.objects
for update to authenticated
using (bucket_id = 'fotos-perfil' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'fotos-perfil' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy fotos_perfil_delete_proprio on storage.objects
for delete to authenticated
using (bucket_id = 'fotos-perfil' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- O supabase-js lista/remove objetos pela API, que exige SELECT nas linhas afetadas.
create policy imagens_select_publico on storage.objects
for select to anon, authenticated
using (bucket_id in ('cardapio', 'fotos-perfil'));
