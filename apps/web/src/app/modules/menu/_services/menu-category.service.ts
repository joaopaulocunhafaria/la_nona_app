import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MenuCategory, MenuCategoryRequest } from '../_modelos/menu-category.model';

@Injectable({ providedIn: 'root' })
export class MenuCategoryService {
	private readonly baseUrl = `${environment.apiUrl}/menu-categories`;

	constructor(private readonly http: HttpClient) {}

	listar(): Observable<MenuCategory[]> {
		return this.http.get<MenuCategory[]>(this.baseUrl);
	}

	criar(request: MenuCategoryRequest): Observable<MenuCategory> {
		return this.http.post<MenuCategory>(this.baseUrl, request);
	}

	excluir(id: string): Observable<void> {
		return this.http.delete<void>(`${this.baseUrl}/${id}`);
	}
}
