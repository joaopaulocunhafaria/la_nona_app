import { unico } from './apoio/geradores';
import { cardDoItem, entrar, esperarSemScrollHorizontal, expect, test } from './apoio/fixtures';

test.describe('Cardápio (leitura pública)', () => {
	test('visitante vê os itens, filtra por categoria e busca por nome', async ({ page, banco }) => {
		const categoria = await banco.criarCategoria(`Massas ${unico()}`);
		const lasanha = await banco.criarItem({ nome: `Lasanha ${unico()}`, preco: 42.5, categoriaId: categoria.id });
		const nhoque = await banco.criarItem({ nome: `Nhoque ${unico()}`, preco: 38, categoriaId: categoria.id });
		const outro = await banco.criarItem({ nome: `Suco ${unico()}` });

		await page.goto('/menu');
		await expect(cardDoItem(page, lasanha.name)).toBeVisible();
		await expect(cardDoItem(page, lasanha.name)).toContainText('42,50');
		await expect(cardDoItem(page, outro.name)).toBeVisible();

		await page.getByRole('button', { name: categoria.name, exact: true }).click();
		await expect(cardDoItem(page, lasanha.name)).toBeVisible();
		await expect(cardDoItem(page, nhoque.name)).toBeVisible();
		await expect(cardDoItem(page, outro.name)).toHaveCount(0);

		await page.getByRole('textbox', { name: 'Buscar no cardápio' }).fill(nhoque.name.toUpperCase());
		await expect(cardDoItem(page, nhoque.name)).toBeVisible();
		await expect(cardDoItem(page, lasanha.name)).toHaveCount(0);

		await page.getByRole('button', { name: 'Todos', exact: true }).click();
		await page.getByRole('textbox', { name: 'Buscar no cardápio' }).fill('');
		await expect(cardDoItem(page, outro.name)).toBeVisible();
		await esperarSemScrollHorizontal(page);
	});

	test('detalhe mostra os dados do item e registra a visualização', async ({ page, banco }) => {
		const item = await banco.criarItem({
			nome: `Risoto ${unico()}`,
			descricao: 'Arroz arbóreo e cogumelos',
			preco: 51.9,
			status: 'FEITO_NA_HORA',
		});

		await entrar(page, await banco.criarUsuario());
		await page.goto('/menu');
		await cardDoItem(page, item.name).click();

		await expect(page).toHaveURL(new RegExp(`/menu/${item.id}$`));
		await expect(page.getByRole('heading', { name: item.name })).toBeVisible();
		await expect(page.getByText('Arroz arbóreo e cogumelos')).toBeVisible();
		await expect(page.getByText(/51,90/)).toBeVisible();
		await expect(page.getByText('Feito na hora')).toBeVisible();
		await expect(page.getByRole('button', { name: /Adicionar ao Carrinho/ })).toBeVisible();

		await expect.poll(() => banco.eventosDeItem(item.id)).toBe(1);
	});

	test('item indisponível não pode ser pedido', async ({ page, banco }) => {
		const item = await banco.criarItem({ nome: `Esgotado ${unico()}`, status: 'INDISPONIVEL' });
		await entrar(page, await banco.criarUsuario());

		await page.goto('/menu');
		const card = cardDoItem(page, item.name);
		await expect(card.getByText('Indisponível')).toBeVisible();
		await expect(card.getByRole('button', { name: 'Adicionar ao carrinho' })).toHaveCount(0);

		await card.click();
		await expect(page.getByRole('heading', { name: item.name })).toBeVisible();
		await expect(page.getByRole('button', { name: /Adicionar ao Carrinho/ })).toHaveCount(0);
	});

	test('id inexistente no detalhe não quebra a página', async ({ page }) => {
		await page.goto('/menu/00000000-0000-4000-8000-000000000000');
		await expect(page.getByRole('heading', { name: 'Detalhes do Item' })).toBeVisible();
		await expect(page.getByRole('button', { name: /Adicionar ao Carrinho/ })).toHaveCount(0);
	});

	test('favoritar e adicionar ao carrinho só aparecem para quem está logado', async ({ page, banco }) => {
		const cliente = await banco.criarUsuario();
		const item = await banco.criarItem();
		const card = cardDoItem(page, item.name);
		const favoritar = page.getByRole('button', { name: 'Adicionar aos favoritos' });
		const adicionar = page.getByRole('button', { name: /Adicionar ao carrinho/i });

		await page.goto('/menu');
		await expect(card).toBeVisible();
		await expect(favoritar).toHaveCount(0);
		await expect(adicionar).toHaveCount(0);

		await card.click();
		await expect(page.getByRole('heading', { name: item.name })).toBeVisible();
		await expect(favoritar).toHaveCount(0);
		await expect(adicionar).toHaveCount(0);

		await entrar(page, cliente);
		await page.goto('/menu');
		await expect(card.getByRole('button', { name: 'Adicionar aos favoritos' })).toBeVisible();
		await expect(card.getByRole('button', { name: 'Adicionar ao carrinho' })).toBeVisible();

		await card.click();
		await expect(page).toHaveURL(new RegExp(`/menu/${item.id}$`));
		await expect(favoritar).toBeVisible();
		await expect(adicionar).toBeVisible();
	});

	test('imagem do detalhe abre em tela cheia, troca ao arrastar e fecha no X', async ({ page, banco }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		const item = await banco.criarItem();
		const svg = (largura: number, altura: number, cor: string) =>
			`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}"><rect width="100%" height="100%" fill="${cor}" stroke="black" stroke-width="20"/></svg>`)}`;
		await banco.admin.from('menu_item_images').delete().eq('menu_item_id', item.id);
		const { error } = await banco.admin.from('menu_item_images').insert([
			{ menu_item_id: item.id, url: svg(300, 900, 'tomato'), position: 0 },
			{ menu_item_id: item.id, url: svg(1200, 300, 'gold'), position: 1 },
		]);
		expect(error).toBeNull();

		await page.goto(`/menu/${item.id}`);
		const abrir = page.getByRole('button', { name: 'Ver imagem em tela cheia' });
		await expect(abrir.locator('img')).toHaveCSS('object-fit', 'contain');
		await abrir.click();

		const visualizador = page.getByRole('dialog', { name: 'Visualização da imagem' });
		await expect(visualizador.getByText('1 / 2')).toBeVisible();
		expect(await visualizador.boundingBox()).toEqual({ x: 16, y: 16, width: 358, height: 812 });

		const arrastar = async (de: number, ate: number) => {
			await page.mouse.move(de, 420);
			await page.mouse.down();
			await page.mouse.move(ate, 420, { steps: 5 });
			await page.mouse.up();
		};
		await arrastar(300, 100);
		await expect(visualizador.getByText('2 / 2')).toBeVisible();
		await expect(visualizador.locator('img').nth(1)).toBeInViewport({ ratio: 0.99 });
		await arrastar(100, 300);
		await expect(visualizador.getByText('1 / 2')).toBeVisible();

		await visualizador.getByRole('button', { name: 'Fechar imagem' }).click();
		await expect(visualizador).toHaveCount(0);
		await expect(page).toHaveURL(new RegExp(`/menu/${item.id}$`));

		await page.getByRole('button', { name: 'Ver imagem em tela cheia' }).click();
		await expect(visualizador).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(visualizador).toHaveCount(0);
	});

	test('cliente não vê as ações de administrador', async ({ page, banco }) => {
		const cliente = await banco.criarUsuario();
		const item = await banco.criarItem();
		await entrar(page, cliente);

		await page.goto('/menu');
		await expect(cardDoItem(page, item.name)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Novo item' })).toHaveCount(0);
		await expect(cardDoItem(page, item.name).getByRole('button', { name: 'Editar item' })).toHaveCount(0);
	});
});
