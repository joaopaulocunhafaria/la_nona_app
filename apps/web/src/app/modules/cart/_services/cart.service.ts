import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Cart } from '../_modelos/cart.model';

const CARRINHO_VAZIO: Cart = { items: [], total: 0 };

@Injectable({ providedIn: 'root' })
export class CartService {
	private readonly baseUrl = `${environment.apiUrl}/cart`;
	private readonly cartSignal = signal<Cart>(CARRINHO_VAZIO);

	readonly cart = this.cartSignal.asReadonly();
	readonly quantidadeTotal = computed(() => this.cartSignal().items.reduce((acc, item) => acc + item.quantity, 0));

	constructor(private readonly http: HttpClient) {}

	carregar(): Observable<Cart> {
		return this.http.get<Cart>(this.baseUrl).pipe(tap((cart) => this.cartSignal.set(cart)));
	}

	adicionar(menuItemId: string, quantity = 1): Observable<Cart> {
		return this.http.post<Cart>(`${this.baseUrl}/items`, { menuItemId, quantity }).pipe(tap((cart) => this.cartSignal.set(cart)));
	}

	atualizarQuantidade(menuItemId: string, quantity: number): Observable<Cart> {
		return this.http.put<Cart>(`${this.baseUrl}/items/${menuItemId}`, { quantity }).pipe(tap((cart) => this.cartSignal.set(cart)));
	}

	remover(menuItemId: string): Observable<Cart> {
		return this.http.delete<Cart>(`${this.baseUrl}/items/${menuItemId}`).pipe(tap((cart) => this.cartSignal.set(cart)));
	}

	limpar(): Observable<void> {
		return this.http.delete<void>(this.baseUrl).pipe(tap(() => this.cartSignal.set(CARRINHO_VAZIO)));
	}
}
