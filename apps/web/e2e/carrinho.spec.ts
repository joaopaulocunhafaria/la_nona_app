import { unico } from './apoio/geradores';
import { cardDoItem, entrar, expect, test, toast } from './apoio/fixtures';

test.describe('Carrinho', () => {
	test('adiciona pela lista (somando quantidade) e o total usa o preço atual', async ({ page, banco }) => {
		const cliente = await banco.criarUsuario();
		const item = await banco.criarItem({ nome: `Pastel ${unico()}`, preco: 10 });
		await entrar(page, cliente);

		await page.goto('/menu');
		const adicionar = cardDoItem(page, item.name).getByRole('button', { name: 'Adicionar ao carrinho' });
		await adicionar.click();
		await expect(toast(page, 'Item adicionado ao carrinho')).toBeVisible();
		await adicionar.click();
		await expect.poll(() => banco.carrinho(cliente.id)).toEqual([{ menu_item_id: item.id, quantity: 2 }]);

		await banco.admin.from('menu_items').update({ price: 12.5 }).eq('id', item.id);

		await page.goto('/cart');
		await expect(page.getByText(item.name)).toBeVisible();
		await expect(page.getByText(/25,00/).first()).toBeVisible();
	});

	test('aumenta, diminui e remove itens', async ({ page, banco }) => {
		const cliente = await banco.criarUsuario();
		const item = await banco.criarItem({ nome: `Coxinha ${unico()}`, preco: 7 });
		await banco.adicionarAoCarrinho(cliente.id, item.id, 1);
		await entrar(page, cliente);

		await page.goto('/cart');
		await page.getByRole('button', { name: 'Aumentar quantidade' }).click();
		await expect.poll(() => banco.carrinho(cliente.id)).toEqual([{ menu_item_id: item.id, quantity: 2 }]);
		await expect(page.getByText(/14,00/).first()).toBeVisible();

		await page.getByRole('button', { name: 'Diminuir quantidade' }).click();
		await expect.poll(() => banco.carrinho(cliente.id)).toEqual([{ menu_item_id: item.id, quantity: 1 }]);

		await page.getByRole('button', { name: 'Diminuir quantidade' }).click();
		await expect(page.getByText('Seu carrinho está vazio')).toBeVisible();
		expect(await banco.carrinho(cliente.id)).toEqual([]);
	});

	test('item que ficou indisponível não pode ter a quantidade aumentada', async ({ page, banco }) => {
		const cliente = await banco.criarUsuario();
		const item = await banco.criarItem({ nome: `Sorvete ${unico()}`, preco: 9 });
		await banco.adicionarAoCarrinho(cliente.id, item.id, 1);
		await banco.admin.from('menu_items').update({ status: 'INDISPONIVEL' }).eq('id', item.id);
		await entrar(page, cliente);

		await page.goto('/cart');
		await page.getByRole('button', { name: 'Aumentar quantidade' }).click();
		await expect(toast(page, 'Este item está indisponível no momento.')).toBeVisible();
		expect(await banco.carrinho(cliente.id)).toEqual([{ menu_item_id: item.id, quantity: 1 }]);

		await page.getByRole('button', { name: 'Remover item' }).click();
		await expect(page.getByText('Seu carrinho está vazio')).toBeVisible();
	});

	test('finalizar pedido envia o resumo no chat e esvazia o carrinho', async ({ page, banco }) => {
		const cliente = await banco.criarUsuario();
		const item = await banco.criarItem({ nome: `Pizza ${unico()}`, preco: 50 });
		await banco.adicionarAoCarrinho(cliente.id, item.id, 2);
		await entrar(page, cliente);

		await page.goto('/cart');
		await page.getByRole('button', { name: /Finalizar Pedido/ }).click();
		await page.getByRole('button', { name: /Cancelar/ }).click();
		expect(await banco.carrinho(cliente.id)).toHaveLength(1);

		await page.getByRole('button', { name: /Finalizar Pedido/ }).click();
		await page.getByRole('button', { name: /Aceitar e fechar pedido/ }).click();

		await expect(toast(page, 'Pedido enviado! Acompanhe pelo chat.')).toBeVisible();
		await expect(page).toHaveURL(/\/chat$/);
		await expect(page.getByText(new RegExp(`2x ${item.name}`))).toBeVisible();
		expect(await banco.carrinho(cliente.id)).toEqual([]);

		const mensagens = await banco.mensagens(cliente.id);
		expect(mensagens).toHaveLength(1);
		expect(mensagens[0].text).toContain(`2x ${item.name}`);
		expect(mensagens[0].text).toContain('Praça da Sé');
		expect((await banco.conversa(cliente.id))?.admin_unread_count).toBe(1);
	});
});
