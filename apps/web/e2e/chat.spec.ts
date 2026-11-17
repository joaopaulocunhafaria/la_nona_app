import type { Browser, Page } from '@playwright/test';
import { unico } from './apoio/geradores';
import { entrar, expect, test } from './apoio/fixtures';
import type { UsuarioCriado } from './apoio/banco';

async function abrirComo(browser: Browser, usuario: UsuarioCriado, rota: string): Promise<Page> {
	const contexto = await browser.newContext({ baseURL: test.info().project.use.baseURL, locale: 'pt-BR' });
	const pagina = await contexto.newPage();
	await entrar(pagina, usuario);
	await pagina.goto(rota);
	return pagina;
}

async function esperarTempoReal(pagina: Page): Promise<void> {
	await expect(pagina.locator('[data-tempo-real="conectado"]')).toBeVisible({ timeout: 15_000 });
}

test.describe('Chat de suporte (Supabase Realtime)', () => {
	test('cliente e admin conversam em tempo real e os contadores de não lidas são zerados', async ({ page, browser, banco }) => {
		const cliente = await banco.criarUsuario({ nome: `Cliente Chat ${unico()}` });
		const admin = await banco.criarUsuario({ admin: true });

		await entrar(page, cliente);
		await page.goto('/chat');
		await expect(page.getByRole('heading', { name: 'Suporte La Nona' })).toBeVisible();
		await esperarTempoReal(page);

		const pergunta = `Olá, meu pedido atrasou? ${unico()}`;
		await page.getByRole('textbox', { name: 'Mensagem' }).fill(pergunta);
		await page.getByRole('button', { name: 'Enviar mensagem' }).click();
		await expect(page.getByText(pergunta)).toHaveCount(1);
		await expect(page.getByRole('textbox', { name: 'Mensagem' })).toHaveValue('');

		await expect.poll(async () => (await banco.mensagens(cliente.id)).map((m) => m.text)).toEqual([pergunta]);
		expect((await banco.conversa(cliente.id))?.admin_unread_count).toBe(1);

		const paginaAdmin = await abrirComo(browser, admin, '/chat/admin');
		const conversa = paginaAdmin.getByRole('button', { name: new RegExp(cliente.nome) });
		await expect(conversa).toContainText(pergunta);
		await conversa.click();
		await expect(paginaAdmin.getByRole('heading', { name: cliente.nome })).toBeVisible();
		await expect(paginaAdmin.getByText(pergunta)).toBeVisible();
		await esperarTempoReal(paginaAdmin);
		await expect.poll(async () => (await banco.conversa(cliente.id))?.admin_unread_count).toBe(0);

		const resposta = `Já está saindo! ${unico()}`;
		await paginaAdmin.getByRole('textbox', { name: 'Mensagem' }).fill(resposta);
		await paginaAdmin.getByRole('textbox', { name: 'Mensagem' }).press('Enter');

		// O cliente recebe sem recarregar a página.
		await expect(page.getByText(resposta)).toBeVisible();
		const mensagens = await banco.mensagens(cliente.id);
		expect(mensagens.map((m) => [m.text, m.is_admin])).toEqual([
			[pergunta, false],
			[resposta, true],
		]);
		await expect.poll(async () => (await banco.conversa(cliente.id))?.user_unread_count).toBe(0);

		await paginaAdmin.context().close();
	});

	test('lista do admin atualiza sozinha quando chega mensagem nova', async ({ page, banco }) => {
		const admin = await banco.criarUsuario({ admin: true });
		const cliente = await banco.criarUsuario({ nome: `Cliente Lista ${unico()}` });
		await entrar(page, admin);
		await page.goto('/chat/admin');
		await expect(page.getByRole('heading', { name: /Conversas|Suporte|Chat/ }).first()).toBeVisible();

		// Dá tempo do canal Realtime da lista assinar antes da mensagem chegar.
		await page.waitForTimeout(1500);
		const texto = `Mensagem nova ${unico()}`;
		await banco.enviarMensagem(cliente.id, cliente.id, texto);

		await expect(page.getByRole('button', { name: new RegExp(cliente.nome) })).toContainText(texto, { timeout: 15_000 });
	});

	test('badge de não lidas na home e mensagem vazia não é enviada', async ({ page, banco }) => {
		const cliente = await banco.criarUsuario();
		const admin = await banco.criarUsuario({ admin: true });
		await banco.enviarMensagem(cliente.id, admin.id, 'Seu pedido saiu para entrega', true);

		await entrar(page, cliente);
		await expect(page.getByRole('button', { name: 'Abrir chat de suporte' })).toContainText('1');
		await page.getByRole('button', { name: 'Abrir chat de suporte' }).click();
		await expect(page).toHaveURL(/\/chat$/);
		await expect(page.getByText('Seu pedido saiu para entrega')).toBeVisible();
		await expect.poll(async () => (await banco.conversa(cliente.id))?.user_unread_count).toBe(0);

		await page.getByRole('textbox', { name: 'Mensagem' }).fill('     ');
		await page.getByRole('button', { name: 'Enviar mensagem' }).click();
		await page.waitForTimeout(500);
		expect(await banco.mensagens(cliente.id)).toHaveLength(1);
	});
});
