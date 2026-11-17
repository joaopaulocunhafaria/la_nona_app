import { entrar, expect, test, toast } from './apoio/fixtures';

test.describe('Navegação e guards', () => {
	test('a raiz mostra o splash e segue para a home', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/home$/, { timeout: 10_000 });
		await expect(page.getByRole('heading', { name: 'La Nona' })).toBeVisible();
	});

	test('rota inexistente volta para o início', async ({ page }) => {
		await page.goto('/rota-que-nao-existe');
		await expect(page).toHaveURL(/\/(home)?$/);
	});

	for (const rota of ['/cart', '/favorites', '/chat']) {
		test(`${rota} exige login e guarda a returnUrl`, async ({ page, banco }) => {
			await page.goto(rota);
			await expect(page).toHaveURL(new RegExp(`/login\\?returnUrl=${encodeURIComponent(rota).replace('/', '%2F')}`));
			await expect(toast(page, 'Faça login para continuar.')).toBeVisible();

			const usuario = await banco.criarUsuario();
			await page.locator('#email').fill(usuario.email);
			await page.locator('#password').fill(usuario.senha);
			await page.getByRole('button', { name: /^\W*Entrar$/ }).click();
			await expect(page).toHaveURL(new RegExp(`${rota}$`));
		});
	}

	for (const rota of ['/admin/users', '/admin/telemetria', '/admin/configuracoes', '/menu/new', '/chat/admin']) {
		test(`${rota} nega acesso a cliente`, async ({ page, banco }) => {
			const cliente = await banco.criarUsuario();
			await entrar(page, cliente);

			await page.goto(rota);
			await expect(page).toHaveURL(/\/home$/);
			await expect(toast(page, 'Você não tem permissão para acessar esta área.')).toBeVisible();
		});
	}

	test('admin vê os atalhos administrativos e a sessão restaura direto na rota protegida', async ({ page, banco }) => {
		const admin = await banco.criarUsuario({ admin: true });
		await entrar(page, admin);

		await expect(page.getByRole('button', { name: /Gestão de Usuários/ })).toBeVisible();
		await expect(page.getByRole('button', { name: /Telemetria/ })).toBeVisible();
		await expect(page.getByRole('button', { name: /Configurações/ })).toBeVisible();

		await page.goto('/admin/configuracoes');
		await expect(page).toHaveURL(/\/admin\/configuracoes$/);
	});

	test('cliente não vê os atalhos administrativos', async ({ page, banco }) => {
		const cliente = await banco.criarUsuario();
		await entrar(page, cliente);
		await expect(page.getByRole('button', { name: /Cardápio/ })).toBeVisible();
		await expect(page.getByRole('button', { name: /Gestão de Usuários/ })).toHaveCount(0);
	});
});
