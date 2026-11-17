import { Injectable, computed, signal } from '@angular/core';
import { from, Observable, switchMap, tap } from 'rxjs';
import { SupabaseService } from '../../../services/supabase.service';
import { dadosOuErro } from '../../../utils/_metodos/supabase';
import { itemDaLinha, SELECT_ITEM_CARDAPIO } from '../../menu/_services/menu-item.service';
import { Cart } from '../_modelos/cart.model';

const CARRINHO_VAZIO: Cart = { items: [], total: 0 };

/** Carrinho do usuário logado. O total é sempre calculado pelo preço ATUAL de cada item. */
@Injectable({ providedIn: 'root' })
export class CartService {
	private readonly cartSignal = signal<Cart>(CARRINHO_VAZIO);

	readonly cart = this.cartSignal.asReadonly();
	readonly quantidadeTotal = computed(() => this.cartSignal().items.reduce((acc, item) => acc + item.quantity, 0));

	constructor(private readonly supabaseService: SupabaseService) {}

	carregar(): Observable<Cart> {
		return from(this.buscarCarrinho()).pipe(tap((cart) => this.cartSignal.set(cart)));
	}

	adicionar(menuItemId: string, quantity = 1): Observable<Cart> {
		return this.executarERecarregar(() =>
			this.supabaseService.client.rpc('adicionar_ao_carrinho', { p_menu_item_id: menuItemId, p_quantidade: quantity }),
		);
	}

	/** Quantidade zero (ou menos) remove o item, como no backend antigo. */
	atualizarQuantidade(menuItemId: string, quantity: number): Observable<Cart> {
		if (quantity <= 0) {
			return this.remover(menuItemId);
		}
		return this.executarERecarregar(() =>
			this.supabaseService.client.from('cart_items').update({ quantity }).eq('menu_item_id', menuItemId).select('id'),
		);
	}

	remover(menuItemId: string): Observable<Cart> {
		return this.executarERecarregar(() => this.supabaseService.client.from('cart_items').delete().eq('menu_item_id', menuItemId));
	}

	limpar(): Observable<void> {
		return from(
			(async () => {
				const usuario = (await this.supabaseService.client.auth.getUser()).data.user;
				if (usuario) {
					dadosOuErro(await this.supabaseService.client.from('cart_items').delete().eq('user_id', usuario.id));
				}
			})(),
		).pipe(tap(() => this.cartSignal.set(CARRINHO_VAZIO)));
	}

	private executarERecarregar(operacao: () => PromiseLike<{ data: unknown; error: Error | null }>): Observable<Cart> {
		return from(
			(async () => {
				dadosOuErro(await operacao());
			})(),
		).pipe(switchMap(() => this.carregar()));
	}

	private async buscarCarrinho(): Promise<Cart> {
		const linhas = dadosOuErro(
			await this.supabaseService.client
				.from('cart_items')
				.select(`id, quantity, added_at, menu_items(${SELECT_ITEM_CARDAPIO})`)
				.order('added_at', { ascending: false }),
		) as unknown as { id: string; quantity: number; added_at: string; menu_items: Parameters<typeof itemDaLinha>[0] }[];

		const items = linhas.map((linha) => {
			const menuItem = itemDaLinha(linha.menu_items);
			return {
				id: linha.id,
				menuItem,
				quantity: linha.quantity,
				addedAt: linha.added_at,
				subtotal: Math.round(menuItem.price * linha.quantity * 100) / 100,
			};
		});

		const total = Math.round(items.reduce((acc, item) => acc + item.subtotal, 0) * 100) / 100;
		return { items, total };
	}
}
