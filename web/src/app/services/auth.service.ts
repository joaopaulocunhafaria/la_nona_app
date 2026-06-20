import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, WritableSignal, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LocalStorageService } from './local-storage.service';
import { AuthResponse, GoogleLoginRequest, LoginRequest, RegisterRequest, UsuarioResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
	private readonly baseUrl = `${environment.apiUrl}/auth`;
	private readonly usuarioSignal: WritableSignal<UsuarioResponse | null>;

	readonly usuario: Signal<UsuarioResponse | null>;
	readonly isAuthenticated: Signal<boolean>;
	readonly isAdmin: Signal<boolean>;

	constructor(
		private readonly http: HttpClient,
		private readonly localStorageService: LocalStorageService,
	) {
		this.usuarioSignal = signal<UsuarioResponse | null>(this.localStorageService.getUsuario());
		this.usuario = this.usuarioSignal.asReadonly();
		this.isAuthenticated = computed(() => this.usuarioSignal() !== null);
		this.isAdmin = computed(() => this.usuarioSignal()?.isAdmin ?? false);
	}

	login(request: LoginRequest): Observable<AuthResponse> {
		return this.http.post<AuthResponse>(`${this.baseUrl}/login`, request).pipe(tap((response) => this.armazenarSessao(response)));
	}

	registrar(request: RegisterRequest): Observable<AuthResponse> {
		return this.http.post<AuthResponse>(`${this.baseUrl}/register`, request).pipe(tap((response) => this.armazenarSessao(response)));
	}

	loginComGoogle(request: GoogleLoginRequest): Observable<AuthResponse> {
		return this.http.post<AuthResponse>(`${this.baseUrl}/google`, request).pipe(tap((response) => this.armazenarSessao(response)));
	}

	logout(): void {
		const refreshToken = this.localStorageService.getRefreshToken();
		this.localStorageService.clear();
		this.usuarioSignal.set(null);

		if (refreshToken) {
			this.http.post(`${this.baseUrl}/logout`, { refreshToken }).subscribe({ error: () => undefined });
		}
	}

	atualizarUsuario(usuario: UsuarioResponse): void {
		this.localStorageService.setUsuario(usuario);
		this.usuarioSignal.set(usuario);
	}

	private armazenarSessao(response: AuthResponse): void {
		this.localStorageService.setSession(response.accessToken, response.refreshToken, response.user);
		this.usuarioSignal.set(response.user);
	}
}
