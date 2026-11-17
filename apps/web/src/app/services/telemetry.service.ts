import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { SupabaseService } from './supabase.service';

/**
 * Coleta de telemetria de uso no app web. Cria uma sessão ao abrir, conta o
 * tempo ativo (apenas com a aba visível e em foco), envia heartbeats e marca o
 * fim ao fechar/descarregar a página. Identifica anônimos por um id local; o
 * usuário logado é associado no banco via auth.uid() (token da sessão Supabase).
 *
 * Toda chamada é best-effort: falhas de telemetria são silenciosas e nunca
 * afetam a experiência do usuário.
 */
@Injectable({ providedIn: 'root' })
export class TelemetryService {
	private readonly anonymousKey = 'telemetryAnonymousId';
	private readonly heartbeatIntervalMs = 30_000;
	private readonly plataforma = 'WEB';

	private sessionId: string | null = null;
	private activeSeconds = 0;
	private tickTimer?: ReturnType<typeof setInterval>;
	private heartbeatTimer?: ReturnType<typeof setInterval>;
	private iniciado = false;
	private tokenAtual: string | null = null;

	constructor(private readonly supabaseService: SupabaseService) {}

	/** Inicia a coleta. Idempotente: chamadas repetidas são ignoradas. */
	iniciar(): void {
		if (this.iniciado || typeof window === 'undefined') {
			return;
		}
		this.iniciado = true;

		// Guarda o token atual para os envios síncronos de fim de página (keepalive).
		this.supabaseService.client.auth.getSession().then(({ data }) => (this.tokenAtual = data.session?.access_token ?? null));
		this.supabaseService.client.auth.onAuthStateChange((_, sessao) => (this.tokenAtual = sessao?.access_token ?? null));

		this.supabaseService.client
			.rpc('iniciar_sessao_telemetria', { p_anonymous_id: this.anonymousId(), p_plataforma: this.plataforma })
			.then(
				({ data }) => (this.sessionId = data ?? null),
				() => undefined,
			);

		// Conta o tempo ativo a cada segundo, somente com a aba visível e em foco.
		this.tickTimer = setInterval(() => {
			if (document.visibilityState === 'visible' && document.hasFocus()) {
				this.activeSeconds++;
			}
		}, 1000);

		this.heartbeatTimer = setInterval(() => this.enviarHeartbeat(), this.heartbeatIntervalMs);

		// Ao esconder a aba, envia um heartbeat final confiável (sem encerrar a
		// sessão, pois o usuário pode voltar). Ao descarregar, encerra a sessão.
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') {
				this.enviarNoFimDaPagina('heartbeat_telemetria');
			}
		});
		window.addEventListener('pagehide', () => this.enviarNoFimDaPagina('encerrar_sessao_telemetria'));
	}

	/**
	 * Registra um acesso à aba de cardápio (/menu). Deve ser chamado a cada
	 * navegação para a lista, sem deduplicar: ir para a home e voltar conta de novo.
	 */
	registrarAcessoMenu(): void {
		this.supabaseService.client
			.rpc('registrar_acesso_menu', { p_anonymous_id: this.anonymousId(), p_plataforma: this.plataforma })
			.then(
				() => undefined,
				() => undefined,
			);
	}

	/** Registra a visualização do detalhe de um item do cardápio. */
	registrarVisualizacaoItem(menuItemId: string): void {
		this.supabaseService.client
			.rpc('registrar_visualizacao_item', {
				p_menu_item_id: menuItemId,
				p_anonymous_id: this.anonymousId(),
				p_plataforma: this.plataforma,
			})
			.then(
				() => undefined,
				() => undefined,
			);
	}

	private enviarHeartbeat(): void {
		if (!this.sessionId) {
			return;
		}
		this.supabaseService.client.rpc('heartbeat_telemetria', { p_sessao: this.sessionId, p_segundos: this.activeSeconds }).then(
			() => undefined,
			() => undefined,
		);
	}

	/**
	 * Envio confiável durante visibilitychange/pagehide. O `sendBeacon` não envia os headers
	 * `apikey`/`Authorization` exigidos pelo PostgREST, então usamos `fetch` com `keepalive`.
	 */
	private enviarNoFimDaPagina(funcao: 'heartbeat_telemetria' | 'encerrar_sessao_telemetria'): void {
		if (!this.sessionId || typeof fetch === 'undefined') {
			return;
		}
		try {
			fetch(`${environment.supabaseUrl}/rest/v1/rpc/${funcao}`, {
				method: 'POST',
				keepalive: true,
				headers: {
					'Content-Type': 'application/json',
					apikey: environment.supabaseKey,
					...(this.tokenAtual ? { Authorization: `Bearer ${this.tokenAtual}` } : {}),
				},
				body: JSON.stringify({ p_sessao: this.sessionId, p_segundos: this.activeSeconds }),
			}).catch(() => undefined);
		} catch {
			// Navegador sem suporte a keepalive: ignora (telemetria é best-effort).
		}
	}

	private anonymousId(): string {
		try {
			let id = localStorage.getItem(this.anonymousKey);
			if (!id) {
				id = crypto.randomUUID();
				localStorage.setItem(this.anonymousKey, id);
			}
			return id;
		} catch {
			return 'sem-armazenamento';
		}
	}
}
