import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AddressRequest, PhotoRequest, UsuarioResponse } from './auth.models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
	private readonly baseUrl = `${environment.apiUrl}/users`;

	constructor(
		private readonly http: HttpClient,
		private readonly authService: AuthService,
	) {}

	getMe(): Observable<UsuarioResponse> {
		return this.http.get<UsuarioResponse>(`${this.baseUrl}/me`).pipe(tap((usuario) => this.authService.atualizarUsuario(usuario)));
	}

	atualizarEndereco(request: AddressRequest): Observable<UsuarioResponse> {
		return this.http
			.put<UsuarioResponse>(`${this.baseUrl}/me/address`, request)
			.pipe(tap((usuario) => this.authService.atualizarUsuario(usuario)));
	}

	atualizarFoto(request: PhotoRequest): Observable<UsuarioResponse> {
		return this.http
			.put<UsuarioResponse>(`${this.baseUrl}/me/photo`, request)
			.pipe(tap((usuario) => this.authService.atualizarUsuario(usuario)));
	}
}
