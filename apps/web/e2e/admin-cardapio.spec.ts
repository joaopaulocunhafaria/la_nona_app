import type { Page } from '@playwright/test';
import { PNG_1X1, unico } from './apoio/geradores';
import { cardDoItem, entrar, escolherNoSelect, expect, test, toast } from './apoio/fixtures';

async function preencherItem(page: Page, dados: { nome: string; descricao: string; preco: string; categoria: string; status?: string }) {
	await page.getByPlaceholder('Ex: Hamburguer Artesanal').fill(dados.nome);
	await page.getByPlaceholder('Ex: Pão brioche, carne 180g...').fill(dados.descricao);
	const preco = page.locator('p-inputnumber input');
	await preco.click();
	await preco.press('Control+A');
	await preco.press('Backspace');
	await preco.pressSequentially(dados.preco);
	const selects = page.locator('p-select');
	await escolherNoSelect(page, selects.nth(0), dados.categoria);
	if (dados.status) {
		await escolherNoSelect(page, selects.nth(1), dados.status);
	}
}

function enviarImagem(page: Page, nome = 'foto.png') {
	return page.locator('input[type="file"][multiple]').setInputFiles({ name: nome, mimeType: 'image/png', buffer: PNG_1X1 });
}

test.describe('Cardápio: administração', () => {
	test('admin cadastra item com imagem enviada ao bucket', async ({ page, banco, request }) => {
		const admin = await banco.criarUsuario({ admin: true });
		const categoria = await banco.criarCategoria(`Grelhados ${unico()}`);
		const nome = `Picanha ${unico()}`;
		await entrar(page, admin);

		await page.goto('/menu');
		await page.getByRole('button', { name: 'Novo item' }).click();
		await expect(page).toHaveURL(/\/menu\/new$/);

		await enviarImagem(page);
		await expect(page.getByAltText('Nova imagem')).toHaveCount(1);
		await preencherItem(page, {
			nome,
			descricao: 'Ao ponto, com farofa',
			preco: '89,90',
			categoria: categoria.name,
			status: 'Feito na hora',
		});
		await page.getByRole('button', { name: /Adicionar Item/ }).click();

		await expect(toast(page, 'Item adicionado com sucesso!')).toBeVisible();
		await expect(page).toHaveURL(/\/menu$/);
		await expect(cardDoItem(page, nome)).toBeVisible();

		const item = await banco.itemPorNome(nome);
		expect(item).not.toBeNull();
		expect(Number(item!.price)).toBe(89.9);
		expect(item!.status).toBe('FEITO_NA_HORA');
		expect(item!.category_id).toBe(categoria.id);
		expect(item!.menu_item_images).toHaveLength(1);
		expect(item!.menu_item_images[0].storage_path).toMatch(/^itens\/.+\.png$/);
		expect(item!.menu_item_images[0].url).toContain('/storage/v1/object/public/cardapio/itens/');

		const imagem = await request.get(item!.menu_item_images[0].url);
		expect(imagem.status()).toBe(200);
	});

	test('sem imagem o item não é salvo', async ({ page, banco }) => {
		const admin = await banco.criarUsuario({ admin: true });
		const categoria = await banco.criarCategoria();
		const nome = `Sem foto ${unico()}`;
		await entrar(page, admin);

		await page.goto('/menu/new');
		await preencherItem(page, { nome, descricao: 'Descrição', preco: '10,00', categoria: categoria.name });
		await page.getByRole('button', { name: /Adicionar Item/ }).click();

		await expect(toast(page, 'Adicione ao menos uma imagem.')).toBeVisible();
		expect(await banco.itemPorNome(nome)).toBeNull();
	});

	test('campos obrigatórios vazios não salvam', async ({ page, banco }) => {
		const admin = await banco.criarUsuario({ admin: true });
		await entrar(page, admin);

		await page.goto('/menu/new');
		await enviarImagem(page);
		await page.getByRole('button', { name: /Adicionar Item/ }).click();
		await expect(page).toHaveURL(/\/menu\/new$/);
		await expect(toast(page, /sucesso/)).toHaveCount(0);
	});

	test('admin edita item: troca a imagem e o preço, e a imagem antiga sai do bucket', async ({ page, banco }) => {
		const admin = await banco.criarUsuario({ admin: true });
		const categoria = await banco.criarCategoria();
		const nome = `Editável ${unico()}`;
		await entrar(page, admin);

		await page.goto('/menu/new');
		await enviarImagem(page, 'primeira.png');
		await preencherItem(page, { nome, descricao: 'Original', preco: '15,00', categoria: categoria.name });
		await page.getByRole('button', { name: /Adicionar Item/ }).click();
		await expect(toast(page, 'Item adicionado com sucesso!')).toBeVisible();
		const criado = await banco.itemPorNome(nome);
		const caminhoAntigo = criado!.menu_item_images[0].storage_path!;

		await cardDoItem(page, nome).getByRole('button', { name: 'Editar item' }).click();
		await expect(page).toHaveURL(new RegExp(`/menu/${criado!.id}/edit$`));
		await expect(page.getByPlaceholder('Ex: Hamburguer Artesanal')).toHaveValue(nome);
		await page.getByAltText('Imagem do item').locator('..').getByRole('button').click();
		await enviarImagem(page, 'segunda.png');
		const preco = page.locator('p-inputnumber input');
		await preco.click();
		await preco.press('Control+A');
		await preco.press('Backspace');
		await preco.pressSequentially('19,90');
		await page.getByRole('button', { name: /Atualizar Item/ }).click();

		await expect(toast(page, 'Item atualizado com sucesso!')).toBeVisible();
		const editado = await banco.itemPorNome(nome);
		expect(Number(editado!.price)).toBe(19.9);
		expect(editado!.menu_item_images).toHaveLength(1);
		expect(editado!.menu_item_images[0].storage_path).not.toBe(caminhoAntigo);

		await expect
			.poll(async () => {
				const pasta = await banco.admin.storage.from('cardapio').list('itens', { search: caminhoAntigo.replace('itens/', '') });
				return pasta.data?.length ?? 0;
			})
			.toBe(0);
	});

	test('admin exclui item com confirmação (e pode cancelar)', async ({ page, banco }) => {
		const admin = await banco.criarUsuario({ admin: true });
		const item = await banco.criarItem({ nome: `Excluível ${unico()}` });
		await entrar(page, admin);

		await page.goto('/menu');
		await cardDoItem(page, item.name).getByRole('button', { name: 'Excluir item' }).click();
		await expect(page.getByText(`Tem certeza que deseja excluir "${item.name}"?`)).toBeVisible();
		await page.getByRole('button', { name: /^\W*Cancelar$/ }).click();
		await expect(cardDoItem(page, item.name)).toBeVisible();
		expect(await banco.itemPorNome(item.name)).not.toBeNull();

		await cardDoItem(page, item.name).getByRole('button', { name: 'Excluir item' }).click();
		await page.getByRole('button', { name: /^\W*Excluir$/ }).click();
		await expect(toast(page, 'Item excluído com sucesso.')).toBeVisible();
		await expect(cardDoItem(page, item.name)).toHaveCount(0);
		expect(await banco.itemPorNome(item.name)).toBeNull();
	});
});
