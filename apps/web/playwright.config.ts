import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de ponta a ponta (E2E) contra o app real + Supabase local (`npm run db:start`).
 * Rodar: `npm run e2e` (na raiz) ou `npx playwright test` dentro de apps/web.
 */
const PORTA = Number(process.env['E2E_PORTA'] ?? 4310);

export default defineConfig({
	testDir: './e2e',
	globalSetup: './e2e/apoio/preparacao-global.ts',
	timeout: 60_000,
	expect: { timeout: 10_000 },
	fullyParallel: true,
	workers: process.env['CI'] ? 2 : 3,
	forbidOnly: !!process.env['CI'],
	retries: process.env['CI'] ? 1 : 0,
	reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-relatorio' }]],
	outputDir: 'e2e-resultados',
	use: {
		baseURL: `http://127.0.0.1:${PORTA}`,
		locale: 'pt-BR',
		timezoneId: 'America/Sao_Paulo',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: {
		command: `npx ng serve --configuration development --host 127.0.0.1 --port ${PORTA}`,
		url: `http://127.0.0.1:${PORTA}`,
		reuseExistingServer: !process.env['CI'],
		timeout: 180_000,
	},
});
