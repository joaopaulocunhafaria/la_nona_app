import { unico } from './apoio/geradores';
import { cardDoItem, entrar, expect, test } from './apoio/fixtures';

test.describe('Favoritos', () => {
	test('favorita pela lista, vê em Meus Favoritos e remove', async ({ page, banco }) => {
		const cliente = await banco.criarUsuario();
		const item = await banco.criarItem({ nome: `Brownie ${unico()}` });
		await entrar(page, cliente);

		await page.goto('/menu');
		await cardDoItem(page, item.name).getByRole('button', { name: 'Adicionar aos favoritos' }).click();
		await expect(cardDoItem(page, item.name).getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible();
		await expect.poll(() => banco.favoritos(cliente.id)).toEqual([item.id]);

		await page.goto('/favorites');
		await expect(page.getByText(item.name)).toBeVisible();
		await page.getByRole('button', { name: 'Remover dos favoritos' }).click();
		await expect(page.getByText('Você ainda não tem favoritos')).toBeVisible();
		expect(await banco.favoritos(cliente.id)).toEqual([]);
	});

	test('favorito do detalhe aparece marcado na lista após recarregar', async ({ page, banco }) => {
		const cliente = await banco.criarUsuario();
		const item = await banco.criarItem({ nome: `Pudim ${unico()}` });
		await entrar(page, cliente);

		await page.goto(`/menu/${item.id}`);
		await page.getByRole('button', { name: 'Adicionar aos favoritos' }).click();
		await expect(page.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible();

		await page.goto('/menu');
		await expect(cardDoItem(page, item.name).getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible();
	});

	test('favoritos de um cliente não aparecem para outro', async ({ page, banco }) => {
		const dono = await banco.criarUsuario();
		const outro = await banco.criarUsuario();
		const item = await banco.criarItem({ nome: `Exclusivo ${unico()}` });
		await banco.favoritar(dono.id, item.id);
		await entrar(page, outro);

		await page.goto('/favorites');
		await expect(page.getByText('Você ainda não tem favoritos')).toBeVisible();
	});
});
