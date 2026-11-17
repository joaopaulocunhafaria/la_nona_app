import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { UsuarioResponse } from '../../../../services/auth.models';

@Injectable({ providedIn: 'root' })
export class AdminUserService {
	private readonly baseUrl = `${environment.apiUrl}/admin/users`;

	constructor(private readonly http: HttpClient) {}

	listar(search?: string): Observable<UsuarioResponse[]> {
		return this.http.get<UsuarioResponse[]>(this.baseUrl, { params: search ? { search } : {} });
	}

	atualizarRole(id: string, role: string): Observable<UsuarioResponse> {
		return this.http.put<UsuarioResponse>(`${this.baseUrl}/${id}/role`, { role });
	}
}
