import { entrar, expect, test, toast } from './apoio/fixtures';

test.describe('Endereço de entrega (salvar_endereco)', () => {
	test('primeiro acesso exige o endereço e grava no perfil', async ({ page, banco }) => {
		const usuario = await banco.criarUsuario({ comEndereco: false });
		await entrar(page, usuario);

		const modal = page.getByRole('dialog', { name: 'Endereço de Entrega' });
		await expect(modal).toBeVisible();
		await expect(modal.getByRole('button', { name: /^\W*Cancelar$/ })).toHaveCount(0);

		await modal.getByPlaceholder('00000-000').fill('01310100');
		await modal.getByPlaceholder('Nome da rua').fill('  Avenida Paulista  ');
		await modal.getByPlaceholder('Bairro').fill('Bela Vista');
		await modal.getByPlaceholder('Nº').fill('1578');
		await modal.getByPlaceholder('Cidade').fill('São Paulo');
		await modal.locator('select').selectOption('SP');
		await modal.getByPlaceholder(/Apto, bloco/).fill('Andar 2');
		await modal.getByRole('button', { name: /Salvar Endereço/ }).click();

		await expect(toast(page, 'Endereço salvo com sucesso!')).toBeVisible();
		await expect(modal).toBeHidden();
		await expect(page.getByText('Avenida Paulista, 1578 - Bela Vista, São Paulo/SP. CEP: 01310-100 (Andar 2)')).toBeVisible();

		const perfil = await banco.perfil(usuario.id);
		expect(perfil.onboarding_completed).toBe(true);
		expect(perfil.address_cep).toBe('01310-100');
		expect(perfil.address_rua).toBe('Avenida Paulista');
		expect(perfil.address_estado).toBe('SP');

		await page.reload();
		await expect(page.getByRole('dialog', { name: 'Endereço de Entrega' })).toHaveCount(0);
	});

	test('CEP inválido não é enviado', async ({ page, banco }) => {
		const usuario = await banco.criarUsuario({ comEndereco: false });
		await entrar(page, usuario);

		const modal = page.getByRole('dialog', { name: 'Endereço de Entrega' });
		await modal.getByPlaceholder('00000-000').fill('123');
		await modal.getByPlaceholder('Nome da rua').fill('Rua A');
		await modal.getByPlaceholder('Bairro').fill('Centro');
		await modal.getByPlaceholder('Nº').fill('10');
		await modal.getByPlaceholder('Cidade').fill('Campinas');
		await modal.locator('select').selectOption('SP');
		await modal.getByRole('button', { name: /Salvar Endereço/ }).click();

		await expect(modal).toBeVisible();
		expect((await banco.perfil(usuario.id)).onboarding_completed).toBe(false);
	});

	test('usuário com endereço pode atualizar e cancelar', async ({ page, banco }) => {
		const usuario = await banco.criarUsuario();
		await entrar(page, usuario);

		await page.getByRole('button', { name: /Atualizar/ }).click();
		const modal = page.getByRole('dialog', { name: 'Endereço de Entrega' });
		await expect(modal.getByPlaceholder('Nome da rua')).toHaveValue('Praça da Sé');

		await modal.getByRole('button', { name: /^\W*Cancelar$/ }).click();
		await expect(modal).toBeHidden();

		await page.getByRole('button', { name: /Atualizar/ }).click();
		await modal.getByPlaceholder('Nº').fill('200A');
		await modal.getByRole('button', { name: /Salvar Endereço/ }).click();
		await expect(toast(page, 'Endereço salvo com sucesso!')).toBeVisible();
		expect((await banco.perfil(usuario.id)).address_numero).toBe('200A');
	});
});
