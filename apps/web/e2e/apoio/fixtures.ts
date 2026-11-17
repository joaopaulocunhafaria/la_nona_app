import { expect, Locator, Page, test as base } from '@playwright/test';
import { Banco, UsuarioCriado } from './banco';

interface Fixtures {
	/** Dados do teste: criados por ele e apagados ao final. */
	banco: Banco;
	/** Falha o teste se a página lançar erro JS não tratado. */
	semErrosJs: void;
}

export const test = base.extend<Fixtures>({
	banco: async ({}, usar) => {
		const banco = new Banco();
		await usar(banco);
		await banco.limpar();
	},
	semErrosJs: [
		async ({ page }, usar) => {
			const erros: string[] = [];
			page.on('pageerror', (erro) => erros.push(erro.message));
			await usar();
			expect(erros, 'Erros JS não tratados na página').toEqual([]);
		},
		{ auto: true },
	],
});

export { expect };

/** Faz login pela tela de e-mail/senha e espera a home (ou a `returnUrl`). */
export async function entrar(page: Page, usuario: Pick<UsuarioCriado, 'email' | 'senha'>, destino = '/login'): Promise<void> {
	await page.goto(destino);
	await page.locator('#email').fill(usuario.email);
	await page.locator('#password').fill(usuario.senha);
	await page.getByRole('button', { name: /^\W*Entrar$/ }).click();
	await expect(page).not.toHaveURL(/\/login/);
}

/** Garante que a página não rola na horizontal. */
export async function esperarSemScrollHorizontal(page: Page): Promise<void> {
	const larguras = await page.evaluate(() => ({ pagina: document.documentElement.scrollWidth, janela: window.innerWidth }));
	expect(larguras.pagina, 'scroll horizontal na página').toBeLessThanOrEqual(larguras.janela);
}

/** Toast do PrimeNG com o texto. */
export function toast(page: Page, texto: string | RegExp): Locator {
	return page.locator('.p-toast-message').filter({ hasText: texto });
}

/** Escolhe uma opção num p-select a partir do elemento que o contém. */
export async function escolherNoSelect(page: Page, select: Locator, opcao: string | RegExp): Promise<void> {
	await select.click();
	await page.getByRole('option').filter({ hasText: opcao }).first().click();
}

/** Card de um item na lista do cardápio. */
export function cardDoItem(page: Page, nome: string): Locator {
	return page.getByTestId('item-cardapio').filter({ hasText: nome });
}
