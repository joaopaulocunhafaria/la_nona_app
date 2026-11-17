import { PNG_1X1 } from './apoio/geradores';
import { entrar, expect, test, toast } from './apoio/fixtures';

test.describe('Foto de perfil (bucket fotos-perfil)', () => {
	test('envia a foto, grava a URL e substitui a anterior no bucket', async ({ page, banco, request }) => {
		const usuario = await banco.criarUsuario();
		await entrar(page, usuario);

		const entrada = page.locator('input[type="file"][accept="image/*"]').first();
		await entrada.setInputFiles({ name: 'eu.png', mimeType: 'image/png', buffer: PNG_1X1 });
		await expect(toast(page, 'Foto de perfil atualizada!')).toBeVisible();
		await expect(page.getByAltText('Foto de perfil')).toBeVisible();

		const primeira = (await banco.perfil(usuario.id)).photo!;
		expect(primeira).toContain(`/storage/v1/object/public/fotos-perfil/${usuario.id}/`);
		expect((await request.get(primeira)).status()).toBe(200);

		await entrada.setInputFiles({ name: 'eu2.png', mimeType: 'image/png', buffer: PNG_1X1 });
		await expect.poll(async () => (await banco.perfil(usuario.id)).photo).not.toBe(primeira);
		await expect.poll(async () => (await banco.admin.storage.from('fotos-perfil').list(usuario.id)).data?.length ?? 0).toBe(1);
	});
});
