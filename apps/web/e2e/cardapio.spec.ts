import { unico } from './apoio/geradores';
import { cardDoItem, entrar, esperarSemScrollHorizontal, expect, test, toast } from './apoio/fixtures';

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

	test('visitante que tenta pedir ou favoritar é levado ao login', async ({ page, banco }) => {
		const item = await banco.criarItem();

		await page.goto('/menu');
		await cardDoItem(page, item.name).getByRole('button', { name: 'Adicionar ao carrinho' }).click();
		await expect(page).toHaveURL(/\/login\?returnUrl=%2Fmenu/);
		await expect(toast(page, 'Faça login para continuar.')).toBeVisible();

		await page.goto('/menu');
		await cardDoItem(page, item.name).getByRole('button', { name: 'Adicionar aos favoritos' }).click();
		await expect(page).toHaveURL(/\/login/);
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
