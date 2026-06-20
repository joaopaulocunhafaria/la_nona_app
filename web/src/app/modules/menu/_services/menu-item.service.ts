import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MenuItem, MenuItemRequest } from '../_modelos/menu-item.model';

@Injectable({ providedIn: 'root' })
export class MenuItemService {
	private readonly baseUrl = `${environment.apiUrl}/menu-items`;

	constructor(private readonly http: HttpClient) {}

	listar(filtros?: { category?: string; available?: boolean; q?: string }): Observable<MenuItem[]> {
		const params: Record<string, string> = {};
		if (filtros?.category) {
			params['category'] = filtros.category;
		}
		if (filtros?.available !== undefined) {
			params['available'] = String(filtros.available);
		}
		if (filtros?.q) {
			params['q'] = filtros.q;
		}
		return this.http.get<MenuItem[]>(this.baseUrl, { params });
	}

	listarCategorias(): Observable<string[]> {
		return this.http.get<string[]>(`${this.baseUrl}/categories`);
	}

	buscarPorId(id: string): Observable<MenuItem> {
		return this.http.get<MenuItem>(`${this.baseUrl}/${id}`);
	}

	criar(request: MenuItemRequest): Observable<MenuItem> {
		return this.http.post<MenuItem>(this.baseUrl, request);
	}

	atualizar(id: string, request: MenuItemRequest): Observable<MenuItem> {
		return this.http.put<MenuItem>(`${this.baseUrl}/${id}`, request);
	}

	excluir(id: string): Observable<void> {
		return this.http.delete<void>(`${this.baseUrl}/${id}`);
	}
}
