import { emailUnico, SENHA_PADRAO, unico } from './apoio/geradores';
import { entrar, esperarSemScrollHorizontal, expect, test, toast } from './apoio/fixtures';

test.describe('Autenticação (Supabase Auth)', () => {
	test('cadastro cria a conta, grava o perfil e abre o endereço obrigatório', async ({ page, banco }) => {
		const email = emailUnico('cadastro');
		const nome = `Nova Pessoa ${unico()}`;

		await page.goto('/login');
		await page.getByRole('button', { name: 'Não tem conta? Crie uma' }).click();
		await page.locator('#name').fill(`  ${nome}  `);
		await page.locator('#email').fill(email.toUpperCase());
		await page.locator('#password').fill(SENHA_PADRAO);
		await page.getByRole('button', { name: /^\W*Criar Conta$/ }).click();

		await expect(page).toHaveURL(/\/home$/);
		await expect(page.getByRole('dialog', { name: 'Endereço de Entrega' })).toBeVisible();

		const perfil = await banco.perfilPorEmail(email);
		expect(perfil).not.toBeNull();
		expect(perfil!.name).toBe(nome);
		expect(perfil!.role).toBe('cliente');
		expect(perfil!.onboarding_completed).toBe(false);
		expect(await banco.loginsDoUsuario(perfil!.id)).toBe(1);
		await esperarSemScrollHorizontal(page);
	});

	test('cadastro com e-mail já existente mostra a mensagem do app', async ({ page, banco }) => {
		const existente = await banco.criarUsuario();

		await page.goto('/login');
		await page.getByRole('button', { name: 'Não tem conta? Crie uma' }).click();
		await page.locator('#email').fill(existente.email);
		await page.locator('#password').fill(SENHA_PADRAO);
		await page.getByRole('button', { name: /^\W*Criar Conta$/ }).click();

		await expect(toast(page, 'Email já está cadastrado. Tente fazer login.')).toBeVisible();
		await expect(page).toHaveURL(/\/login/);
	});

	test('login com senha errada é recusado com mensagem em português', async ({ page, banco }) => {
		const usuario = await banco.criarUsuario();

		await page.goto('/login');
		await page.locator('#email').fill(usuario.email);
		await page.locator('#password').fill('senha-errada-123');
		await page.getByRole('button', { name: /^\W*Entrar$/ }).click();

		await expect(toast(page, 'E-mail ou senha incorretos.')).toBeVisible();
		await expect(page).toHaveURL(/\/login/);
		expect(await banco.loginsDoUsuario(usuario.id)).toBe(0);
	});

	test('validação do formulário: e-mail inválido e senha curta não enviam', async ({ page }) => {
		await page.goto('/login');
		await page.locator('#email').fill('nao-e-email');
		await page.locator('#password').fill('1234567');
		await page.getByRole('button', { name: /^\W*Entrar$/ }).click();

		await expect(page.getByText('Informe um email válido.')).toBeVisible();
		await expect(page.getByText('A senha deve ter ao menos 8 caracteres.')).toBeVisible();
		await expect(page).toHaveURL(/\/login/);
	});

	test('login registra o evento, a sessão sobrevive ao reload e o logout encerra', async ({ page, banco }) => {
		const usuario = await banco.criarUsuario();

		await entrar(page, usuario);
		await expect(page).toHaveURL(/\/home$/);
		await expect(page.getByText(usuario.email)).toBeVisible();
		expect(await banco.loginsDoUsuario(usuario.id)).toBe(1);

		await page.reload();
		await expect(page.getByText(usuario.email)).toBeVisible();

		await page.getByRole('button', { name: 'Sair da conta' }).click();
		await page.getByRole('button', { name: /^\W*Sair$/ }).click();
		await expect(page).toHaveURL(/\/(home)?$/);

		await page.goto('/home');
		await expect(page.getByRole('button', { name: /Entrar ou Criar Conta/ })).toBeVisible();
	});

	test('cancelar o logout mantém a sessão', async ({ page, banco }) => {
		const usuario = await banco.criarUsuario();
		await entrar(page, usuario);

		await page.getByRole('button', { name: 'Sair da conta' }).click();
		await page.getByRole('button', { name: /^\W*Cancelar$/ }).click();
		await expect(page.getByText(usuario.email)).toBeVisible();
	});
});
