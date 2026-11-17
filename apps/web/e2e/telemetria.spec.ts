import { unico } from './apoio/geradores';
import { cardDoItem, entrar, expect, test } from './apoio/fixtures';

test.describe('Telemetria', () => {
	test('visitante anônimo gera sessão, acesso ao cardápio e visualização de item', async ({ page, banco }) => {
		const item = await banco.criarItem({ nome: `Visto ${unico()}` });

		await page.goto('/menu');
		await cardDoItem(page, item.name).click();
		await expect(page.getByRole('heading', { name: item.name })).toBeVisible();

		const anonimo = await page.evaluate(() => localStorage.getItem('telemetryAnonymousId'));
		expect(anonimo).toBeTruthy();

		await expect
			.poll(async () => {
				const { count } = await banco.admin
					.from('telemetry_sessions')
					.select('id', { count: 'exact', head: true })
					.eq('anonymous_id', anonimo!)
					.is('user_id', null);
				return count;
			})
			.toBeGreaterThan(0);
		await expect
			.poll(async () => {
				const { count } = await banco.admin
					.from('menu_view_events')
					.select('id', { count: 'exact', head: true })
					.eq('anonymous_id', anonimo!);
				return count;
			})
			.toBeGreaterThan(0);
		await expect.poll(() => banco.eventosDeItem(item.id)).toBe(1);
	});

	test('admin vê o painel com online, logins e itens mais vistos', async ({ page, banco }) => {
		const admin = await banco.criarUsuario({ admin: true });
		const item = await banco.criarItem({ nome: `Popular ${unico()}` });
		await entrar(page, admin);
		await page.goto(`/menu/${item.id}`);
		await expect(page.getByRole('heading', { name: item.name })).toBeVisible();
		await expect.poll(() => banco.eventosDeItem(item.id)).toBe(1);

		await page.goto('/admin/telemetria');
		await expect(page.getByRole('heading', { name: 'Usuários online agora' })).toBeVisible();
		await expect(page.getByText('Logados')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Logins por período' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Itens mais visualizados' })).toBeVisible();
		await expect(page.getByText('Sem visualizações no período.')).toHaveCount(0);

		const { data: online } = await banco.admin.from('telemetry_sessions').select('id').is('ended_at', null).limit(1);
		expect(online?.length).toBe(1);
	});
});
