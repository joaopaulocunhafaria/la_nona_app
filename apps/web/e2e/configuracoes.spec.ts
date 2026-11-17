import { unico } from './apoio/geradores';
import { entrar, expect, test, toast } from './apoio/fixtures';

test.describe('Configurações: categorias do cardápio', () => {
	test('admin cadastra categoria (nome aparado) e vê a contagem de itens', async ({ page, banco }) => {
		const admin = await banco.criarUsuario({ admin: true });
		const comItens = await banco.criarCategoria(`Com itens ${unico()}`);
		await banco.criarItem({ categoriaId: comItens.id });
		const nome = `Massas ${unico()}`;
		await entrar(page, admin);

		await page.goto('/admin/configuracoes');
		await expect(page.getByText(comItens.name)).toBeVisible();
		await expect(page.getByText(comItens.name).locator('..')).toContainText('1 item vinculado');

		await page.getByRole('textbox', { name: 'Nome da nova categoria' }).fill(`  ${nome}  `);
		await page.getByRole('button', { name: /^\W*Adicionar$/ }).click();

		await expect(toast(page, 'Categoria cadastrada com sucesso!')).toBeVisible();
		await expect(page.getByText(nome, { exact: true })).toBeVisible();
		expect(await banco.categoriaPorNome(nome)).not.toBeNull();
	});

	test('nome vazio e duplicado são recusados', async ({ page, banco }) => {
		const admin = await banco.criarUsuario({ admin: true });
		const existente = await banco.criarCategoria(`Duplicada ${unico()}`);
		await entrar(page, admin);

		await page.goto('/admin/configuracoes');
		const campo = page.getByRole('textbox', { name: 'Nome da nova categoria' });
		await campo.fill('   ');
		await page.getByRole('button', { name: /^\W*Adicionar$/ }).click();
		await expect(toast(page, 'Informe o nome da categoria.')).toBeVisible();

		await campo.fill(existente.name.toLowerCase());
		await page.getByRole('button', { name: /^\W*Adicionar$/ }).click();
		await expect(toast(page, 'Já existe uma categoria com esse nome.')).toBeVisible();
	});

	test('exclui categoria sem itens e bloqueia a que tem itens', async ({ page, banco }) => {
		const admin = await banco.criarUsuario({ admin: true });
		const vazia = await banco.criarCategoria(`Vazia ${unico()}`);
		const usada = await banco.criarCategoria(`Usada ${unico()}`);
		await banco.criarItem({ categoriaId: usada.id });
		await entrar(page, admin);

		await page.goto('/admin/configuracoes');
		await expect(page.getByRole('button', { name: `Excluir categoria ${usada.name}` })).toBeDisabled();

		await page.getByRole('button', { name: `Excluir categoria ${vazia.name}` }).click();
		await page.getByRole('button', { name: /^\W*Cancelar$/ }).click();
		expect(await banco.categoriaPorNome(vazia.name)).not.toBeNull();

		await page.getByRole('button', { name: `Excluir categoria ${vazia.name}` }).click();
		await page.getByRole('button', { name: /^\W*Excluir$/ }).click();
		await expect(toast(page, 'Categoria excluída com sucesso.')).toBeVisible();
		await expect(page.getByText(vazia.name, { exact: true })).toHaveCount(0);
		expect(await banco.categoriaPorNome(vazia.name)).toBeNull();
	});
});
