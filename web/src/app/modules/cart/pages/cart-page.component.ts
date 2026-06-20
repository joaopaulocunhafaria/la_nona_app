import { Component, OnInit, Signal, signal } from '@angular/core';
import { NotificacoesService } from '../../../services/notificacoes.service';
import { Cart, CartItem } from '../_modelos/cart.model';
import { CartService } from '../_services/cart.service';

@Component({
	selector: 'app-cart-page',
	standalone: false,
	templateUrl: './cart-page.component.html',
	styleUrl: './cart-page.component.scss',
})
export class CartPageComponent implements OnInit {
	readonly cart: Signal<Cart>;
	readonly carregando = signal(true);

	constructor(
		private readonly cartService: CartService,
		private readonly notificacoesService: NotificacoesService,
	) {
		this.cart = this.cartService.cart;
	}

	ngOnInit(): void {
		this.cartService.carregar().subscribe({
			next: () => this.carregando.set(false),
			error: () => this.carregando.set(false),
		});
	}

	primeiraImagem(item: CartItem): string | null {
		return item.menuItem.images.length > 0 ? item.menuItem.images[0].data : null;
	}

	diminuir(item: CartItem): void {
		const novaQuantidade = item.quantity - 1;
		if (novaQuantidade <= 0) {
			this.remover(item);
			return;
		}
		this.cartService.atualizarQuantidade(item.menuItem.id, novaQuantidade).subscribe();
	}

	aumentar(item: CartItem): void {
		this.cartService.atualizarQuantidade(item.menuItem.id, item.quantity + 1).subscribe();
	}

	remover(item: CartItem): void {
		this.cartService.remover(item.menuItem.id).subscribe();
	}

	finalizarPedido(): void {
		this.notificacoesService.info('Finalizar pedido em desenvolvimento.');
	}
}
