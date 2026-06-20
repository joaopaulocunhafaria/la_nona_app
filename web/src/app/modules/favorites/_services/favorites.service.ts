import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MenuItem } from '../../menu/_modelos/menu-item.model';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
	private readonly baseUrl = `${environment.apiUrl}/favorites`;
	private readonly favoritosSignal = signal<MenuItem[]>([]);

	readonly favoritos = this.favoritosSignal.asReadonly();
	readonly favoritoIds = computed(() => new Set(this.favoritosSignal().map((item) => item.id)));

	constructor(private readonly http: HttpClient) {}

	carregar(): Observable<MenuItem[]> {
		return this.http.get<MenuItem[]>(this.baseUrl).pipe(tap((favoritos) => this.favoritosSignal.set(favoritos)));
	}

	isFavorito(menuItemId: string): boolean {
		return this.favoritoIds().has(menuItemId);
	}

	alternar(item: MenuItem): Observable<void> {
		return this.isFavorito(item.id) ? this.remover(item.id) : this.adicionar(item);
	}

	private adicionar(item: MenuItem): Observable<void> {
		return this.http
			.post<void>(`${this.baseUrl}/${item.id}`, null)
			.pipe(tap(() => this.favoritosSignal.set([...this.favoritosSignal(), item])));
	}

	private remover(menuItemId: string): Observable<void> {
		return this.http
			.delete<void>(`${this.baseUrl}/${menuItemId}`)
			.pipe(tap(() => this.favoritosSignal.set(this.favoritosSignal().filter((item) => item.id !== menuItemId))));
	}
}
