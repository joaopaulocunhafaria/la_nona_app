import { unico } from './apoio/geradores';
import { entrar, escolherNoSelect, expect, test, toast } from './apoio/fixtures';

test.describe('Gestão de usuários (admin)', () => {
	test('admin busca um usuário e altera o cargo', async ({ page, banco }) => {
		const admin = await banco.criarUsuario({ admin: true });
		const cliente = await banco.criarUsuario({ nome: `Fulano ${unico()}` });
		await entrar(page, admin);

		await page.goto('/admin/users');
		await page.getByPlaceholder('Buscar por nome ou email...').fill(cliente.email.toUpperCase());
		const linha = page.getByRole('button', { name: new RegExp(cliente.nome) });
		await expect(linha).toBeVisible();
		await expect(page.getByRole('button', { name: new RegExp(admin.nome) })).toHaveCount(0);

		await linha.click();
		const modal = page.getByRole('dialog', { name: 'Detalhes do Usuário' });
		await expect(modal).toContainText(cliente.email);
		await expect(modal).toContainText('Praça da Sé, 100 - Sé, São Paulo/SP');
		await escolherNoSelect(page, modal.locator('p-select'), 'Entregador');
		await modal.getByRole('button', { name: /Salvar Alterações/ }).click();

		await expect(toast(page, 'Cargo atualizado com sucesso!')).toBeVisible();
		expect((await banco.perfil(cliente.id)).role).toBe('entregador');
	});

	test('busca sem resultado mostra o estado vazio', async ({ page, banco }) => {
		const admin = await banco.criarUsuario({ admin: true });
		await entrar(page, admin);

		await page.goto('/admin/users');
		await page.getByPlaceholder('Buscar por nome ou email...').fill(`ninguem-${unico()}`);
		await expect(page.getByText('Nenhum usuário encontrado.')).toBeVisible();
	});

	test('promoção a admin vale sem novo login', async ({ page, browser, banco }) => {
		const admin = await banco.criarUsuario({ admin: true });
		const promovido = await banco.criarUsuario({ nome: `Promovido ${unico()}` });

		const contexto = await browser.newContext({ baseURL: test.info().project.use.baseURL, locale: 'pt-BR' });
		const paginaPromovido = await contexto.newPage();
		await entrar(paginaPromovido, promovido);
		await expect(paginaPromovido.getByRole('button', { name: /Gestão de Usuários/ })).toHaveCount(0);

		await entrar(page, admin);
		await page.goto('/admin/users');
		await page.getByRole('button', { name: new RegExp(promovido.nome) }).click();
		const modal = page.getByRole('dialog', { name: 'Detalhes do Usuário' });
		await escolherNoSelect(page, modal.locator('p-select'), 'Admin');
		await modal.getByRole('button', { name: /Salvar Alterações/ }).click();
		await expect(toast(page, 'Cargo atualizado com sucesso!')).toBeVisible();

		await paginaPromovido.reload();
		await expect(paginaPromovido.getByRole('button', { name: /Gestão de Usuários/ })).toBeVisible();
		await paginaPromovido.goto('/admin/users');
		await expect(paginaPromovido).toHaveURL(/\/admin\/users$/);
		await contexto.close();
	});
});
