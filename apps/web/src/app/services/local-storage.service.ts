import { Injectable } from '@angular/core';
import { UsuarioResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
	private readonly tokenKey = 'token';
	private readonly refreshTokenKey = 'refreshToken';
	private readonly usuarioKey = 'usuario';

	getToken(): string | null {
		return localStorage.getItem(this.tokenKey);
	}

	getRefreshToken(): string | null {
		return localStorage.getItem(this.refreshTokenKey);
	}

	getUsuario(): UsuarioResponse | null {
		const raw = localStorage.getItem(this.usuarioKey);
		return raw ? (JSON.parse(raw) as UsuarioResponse) : null;
	}

	setSession(accessToken: string, refreshToken: string, usuario: UsuarioResponse): void {
		localStorage.setItem(this.tokenKey, accessToken);
		localStorage.setItem(this.refreshTokenKey, refreshToken);
		this.setUsuario(usuario);
	}

	setUsuario(usuario: UsuarioResponse): void {
		// Foto vem em base64 e pode facilmente exceder a cota do localStorage; a versão completa
		// já fica disponível em memória (signal) e é buscada novamente via getMe() quando necessário.
		const usuarioParaCache: UsuarioResponse = { ...usuario, photo: null };
		try {
			localStorage.setItem(this.usuarioKey, JSON.stringify(usuarioParaCache));
		} catch {
			// Cota excedida mesmo sem a foto (ex.: navegador com pouco espaço); ignora o cache,
			// o login/sessão continua funcionando normalmente a partir do signal em memória.
		}
	}

	clear(): void {
		localStorage.removeItem(this.tokenKey);
		localStorage.removeItem(this.refreshTokenKey);
		localStorage.removeItem(this.usuarioKey);
	}
}
