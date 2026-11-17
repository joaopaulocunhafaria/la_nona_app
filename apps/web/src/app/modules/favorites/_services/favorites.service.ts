import { Injectable, computed, signal } from '@angular/core';
import { from, map, Observable, tap } from 'rxjs';
import { SupabaseService } from '../../../services/supabase.service';
import { codigoErro, dadosOuErro } from '../../../utils/_metodos/supabase';
import { MenuItem } from '../../menu/_modelos/menu-item.model';
import { itemDaLinha, SELECT_ITEM_CARDAPIO } from '../../menu/_services/menu-item.service';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
	private readonly favoritosSignal = signal<MenuItem[]>([]);

	readonly favoritos = this.favoritosSignal.asReadonly();
	readonly favoritoIds = computed(() => new Set(this.favoritosSignal().map((item) => item.id)));

	constructor(private readonly supabaseService: SupabaseService) {}

	carregar(): Observable<MenuItem[]> {
		return from(
			this.supabaseService.client.from('favorites').select(`menu_items(${SELECT_ITEM_CARDAPIO})`).order('created_at'),
		).pipe(
			map((resposta) => {
				const linhas = dadosOuErro(resposta) as unknown as { menu_items: Parameters<typeof itemDaLinha>[0] }[];
				return linhas.map((linha) => itemDaLinha(linha.menu_items));
			}),
			tap((favoritos) => this.favoritosSignal.set(favoritos)),
		);
	}

	isFavorito(menuItemId: string): boolean {
		return this.favoritoIds().has(menuItemId);
	}

	alternar(item: MenuItem): Observable<void> {
		return this.isFavorito(item.id) ? this.remover(item.id) : this.adicionar(item);
	}

	/** Favoritar é idempotente: se já existir no banco, apenas sincroniza a lista local. */
	private adicionar(item: MenuItem): Observable<void> {
		return from(
			(async () => {
				const { error } = await this.supabaseService.client.from('favorites').insert({ menu_item_id: item.id });
				if (error && codigoErro(error) !== '23505') {
					throw error;
				}
			})(),
		).pipe(tap(() => this.favoritosSignal.set([...this.favoritosSignal(), item])));
	}

	private remover(menuItemId: string): Observable<void> {
		return from(
			(async () => {
				dadosOuErro(await this.supabaseService.client.from('favorites').delete().eq('menu_item_id', menuItemId));
			})(),
		).pipe(tap(() => this.favoritosSignal.set(this.favoritosSignal().filter((item) => item.id !== menuItemId))));
	}
}
