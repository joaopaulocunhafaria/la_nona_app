-- Dados de DESENVOLVIMENTO (rodado só no `npm run db:reset` local; não vai para produção).
-- Não há usuários aqui: cadastre-se pela tela e promova a admin com
--   update public.profiles set role = 'admin' where email = 'seu-email@exemplo.com';

with categorias as (
	select id, name from public.menu_categories
),
itens as (
	insert into public.menu_items (name, description, price, category_id, status)
	select v.nome, v.descricao, v.preco, c.id, v.status
	from (values
		('X-Nona', 'Hambúrguer artesanal 180 g, queijo, alface, tomate e molho da casa.', 32.90, 'Hamburguer', 'DISPONIVEL'),
		('Pizza Margherita', 'Molho de tomate, muçarela, tomate e manjericão fresco.', 54.00, 'Pizza', 'FEITO_NA_HORA'),
		('Salada Caprese', 'Tomate, muçarela de búfala, manjericão e azeite.', 28.50, 'Salada', 'VERIFICAR_DISPONIBILIDADE'),
		('Suco de Laranja', 'Natural, 500 ml.', 9.90, 'Bebida', 'DISPONIVEL'),
		('Tiramisù', 'Clássico italiano com café e mascarpone.', 19.00, 'Sobremesa', 'INDISPONIVEL')
	) as v (nome, descricao, preco, categoria, status)
	join categorias c on c.name = v.categoria
	returning id, name
)
insert into public.menu_item_images (menu_item_id, url, position)
select i.id, 'https://placehold.co/600x400/png?text=' || replace(i.name, ' ', '+'), 0
from itens i;
