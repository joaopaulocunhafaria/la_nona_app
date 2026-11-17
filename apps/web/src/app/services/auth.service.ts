import { Injectable, Signal, WritableSignal, computed, signal } from '@angular/core';
import { AuthError } from '@supabase/supabase-js';
import { from, Observable } from 'rxjs';
import { dadosOuErro } from '../utils/_metodos/supabase';
import { GoogleLoginRequest, LoginRequest, RegisterRequest, UsuarioResponse, usuarioDoPerfil } from './auth.models';
import { SupabaseService } from './supabase.service';

/** Traduz os erros do Supabase Auth para as mensagens em pt-BR usadas pelo app. */
function mensagemAuth(erro: unknown): Error {
	if (erro instanceof AuthError) {
		const codigo = erro.code ?? '';
		if (codigo === 'invalid_credentials') return new Error('E-mail ou senha incorretos.');
		if (codigo === 'user_already_exists' || codigo === 'email_exists') return new Error('Email já está cadastrado. Tente fazer login.');
		if (codigo === 'weak_password') return new Error('Senha deve ter no mínimo 8 caracteres');
		if (codigo === 'validation_failed' || codigo === 'email_address_invalid') return new Error('Email inválido');
		if (codigo === 'user_banned') return new Error('Usuário foi desabilitado.');
		if (codigo === 'over_request_rate_limit' || codigo === 'over_email_send_rate_limit') {
			return new Error('Muitas tentativas. Aguarde um pouco e tente novamente.');
		}
		return new Error('Não foi possível concluir a autenticação. Tente novamente.');
	}
	return erro instanceof Error ? erro : new Error('Não foi possível concluir a operação.');
}

/**
 * Sessão do usuário via Supabase Auth (e-mail/senha e Google). A sessão é persistida e
 * renovada pelo supabase-js; aqui fica só o perfil carregado de `profiles`, exposto em signals.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
	private readonly usuarioSignal: WritableSignal<UsuarioResponse | null> = signal<UsuarioResponse | null>(null);
	private sessaoRestaurada: Promise<void> | null = null;

	readonly usuario: Signal<UsuarioResponse | null> = this.usuarioSignal.asReadonly();
	readonly isAuthenticated: Signal<boolean> = computed(() => this.usuarioSignal() !== null);
	readonly isAdmin: Signal<boolean> = computed(() => this.usuarioSignal()?.isAdmin ?? false);

	constructor(private readonly supabaseService: SupabaseService) {
		this.supabaseService.client.auth.onAuthStateChange((evento) => {
			// Nada de chamadas ao Supabase aqui dentro (o supabase-js segura um lock durante o callback).
			if (evento === 'SIGNED_OUT') {
				this.usuarioSignal.set(null);
			}
		});
	}

	/** Resolve quando a sessão persistida (se houver) foi restaurada e o perfil carregado. */
	sessaoPronta(): Promise<void> {
		this.sessaoRestaurada ??= this.restaurarSessao();
		return this.sessaoRestaurada;
	}

	login(request: LoginRequest): Observable<UsuarioResponse> {
		return from(
			this.autenticar(() =>
				this.supabaseService.client.auth.signInWithPassword({ email: request.email.trim().toLowerCase(), password: request.password }),
			),
		);
	}

	registrar(request: RegisterRequest): Observable<UsuarioResponse> {
		return from(
			this.autenticar(() =>
				this.supabaseService.client.auth.signUp({
					email: request.email.trim().toLowerCase(),
					password: request.password,
					options: { data: { name: request.name?.trim() ?? '' } },
				}),
			),
		);
	}

	loginComGoogle(request: GoogleLoginRequest): Observable<UsuarioResponse> {
		return from(this.autenticar(() => this.supabaseService.client.auth.signInWithIdToken({ provider: 'google', token: request.idToken })));
	}

	logout(): void {
		this.usuarioSignal.set(null);
		this.supabaseService.client.auth.signOut({ scope: 'local' }).catch(() => undefined);
	}

	atualizarUsuario(usuario: UsuarioResponse): void {
		this.usuarioSignal.set(usuario);
	}

	/** Relê o perfil do usuário logado (`profiles`). */
	recarregarPerfil(): Observable<UsuarioResponse> {
		return from(
			(async () => {
				const { data } = await this.supabaseService.client.auth.getSession();
				if (!data.session) {
					this.usuarioSignal.set(null);
					throw new Error('Sessão expirada. Faça login novamente.');
				}
				return this.carregarPerfil(data.session.user.id);
			})(),
		);
	}

	private async restaurarSessao(): Promise<void> {
		try {
			const { data } = await this.supabaseService.client.auth.getSession();
			if (data.session) {
				await this.carregarPerfil(data.session.user.id);
			}
		} catch {
			// Sessão inválida/expirada ou perfil inacessível: segue como visitante.
			this.usuarioSignal.set(null);
		}
	}

	private async autenticar(
		chamada: () => Promise<{ data: { user: { id: string } | null; session: unknown }; error: AuthError | null }>,
	): Promise<UsuarioResponse> {
		const { data, error } = await chamada();
		if (error) {
			throw mensagemAuth(error);
		}
		if (!data.user || !data.session) {
			throw new Error('Confirme seu e-mail para concluir o cadastro.');
		}

		const usuario = await this.carregarPerfil(data.user.id);
		// Telemetria de login: best-effort, nunca bloqueia o fluxo.
		this.supabaseService.client
			.rpc('registrar_login', { p_plataforma: 'WEB' })
			.then(
				() => undefined,
				() => undefined,
			);
		return usuario;
	}

	private async carregarPerfil(id: string): Promise<UsuarioResponse> {
		const perfil = dadosOuErro(await this.supabaseService.client.from('profiles').select('*').eq('id', id).single());
		const usuario = usuarioDoPerfil(perfil);
		this.usuarioSignal.set(usuario);
		return usuario;
	}
}

