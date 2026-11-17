import { Injectable, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { ConversaChat, MensagemChat } from '@lanona/shared';
import { from, map, Observable, Subject } from 'rxjs';
import { dadosOuErro, deSupabase } from '../utils/_metodos/supabase';
import { ChatMessagePage, ChatMessageResponse, ChatThreadResponse } from './chat.models';
import { SupabaseService } from './supabase.service';

function mensagemDaLinha(linha: MensagemChat): ChatMessageResponse {
	return { id: linha.id, senderId: linha.sender_id, text: linha.text, isAdmin: linha.is_admin, sentAt: linha.sent_at };
}

function conversaDaLinha(linha: ConversaChat & { profiles?: { name: string } | null }): ChatThreadResponse {
	return {
		userId: linha.user_id,
		userName: linha.profiles?.name || 'Cliente',
		lastMessage: linha.last_message,
		updatedAt: linha.updated_at,
		adminUnreadCount: linha.admin_unread_count,
		userUnreadCount: linha.user_unread_count,
	};
}

/**
 * Chat de suporte via Supabase: leitura com RLS (dono da conversa ou admin), envio pela RPC
 * `enviar_mensagem_chat` e tempo real com canais Realtime (`postgres_changes`).
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
	private readonly canaisDeThread = new Map<string, { canal: RealtimeChannel; subject: Subject<ChatMessageResponse> }>();
	private canalAdmin: { canal: RealtimeChannel; subject: Subject<ChatThreadResponse> } | null = null;

	readonly conectado = signal(false);

	constructor(private readonly supabaseService: SupabaseService) {}

	/** Os canais são abertos sob demanda; aqui só garantimos que o Realtime usa o token da sessão atual. */
	conectar(): void {
		this.supabaseService.client.auth.getSession().then(({ data }) => {
			if (data.session) {
				this.supabaseService.client.realtime.setAuth(data.session.access_token);
			}
		});
	}

	desconectar(): void {
		for (const { canal, subject } of this.canaisDeThread.values()) {
			subject.complete();
			this.supabaseService.client.removeChannel(canal);
		}
		this.canaisDeThread.clear();
		if (this.canalAdmin) {
			this.canalAdmin.subject.complete();
			this.supabaseService.client.removeChannel(this.canalAdmin.canal);
			this.canalAdmin = null;
		}
		this.conectado.set(false);
	}

	/** Novas mensagens da conversa do cliente `userId`, em tempo real. */
	mensagensDaThread(userId: string): Observable<ChatMessageResponse> {
		let registro = this.canaisDeThread.get(userId);
		if (!registro) {
			const subject = new Subject<ChatMessageResponse>();
			const canal = this.supabaseService.client
				.channel(`chat-conversa-${userId}`)
				.on<MensagemChat>(
					'postgres_changes',
					{ event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_user_id=eq.${userId}` },
					(payload) => subject.next(mensagemDaLinha(payload.new as MensagemChat)),
				)
				.subscribe((status) => this.conectado.set(status === 'SUBSCRIBED'));
			registro = { canal, subject };
			this.canaisDeThread.set(userId, registro);
		}
		return registro.subject.asObservable();
	}

	/** Alterações em qualquer conversa (lista do admin). */
	atualizacoesDeThreadsAdmin(): Observable<ChatThreadResponse> {
		if (!this.canalAdmin) {
			const subject = new Subject<ChatThreadResponse>();
			const canal = this.supabaseService.client
				.channel('chat-conversas-admin')
				.on<ConversaChat>('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, (payload) => {
					if (payload.new && 'user_id' in payload.new) {
						subject.next(conversaDaLinha(payload.new as ConversaChat));
					}
				})
				.subscribe();
			this.canalAdmin = { canal, subject };
		}
		return this.canalAdmin.subject.asObservable();
	}

	enviarMensagem(userId: string, text: string): Observable<ChatMessageResponse> {
		return deSupabase(this.supabaseService.client.rpc('enviar_mensagem_chat', { p_thread_user_id: userId, p_texto: text })).pipe(
			map((linha) => mensagemDaLinha(linha)),
		);
	}

	getThreads(): Observable<ChatThreadResponse[]> {
		return deSupabase(
			this.supabaseService.client
				.from('chat_threads')
				.select('user_id, last_message, updated_at, admin_unread_count, user_unread_count, profiles(name)')
				.order('updated_at', { ascending: false }),
		).pipe(map((linhas) => (linhas as unknown as (ConversaChat & { profiles: { name: string } | null })[]).map(conversaDaLinha)));
	}

	getTotalUnreadCountAdmin(): Observable<{ total: number }> {
		return deSupabase(this.supabaseService.client.from('chat_threads').select('admin_unread_count')).pipe(
			map((linhas) => ({ total: linhas.reduce((soma, linha) => soma + linha.admin_unread_count, 0) })),
		);
	}

	getMyUnreadCount(): Observable<{ count: number }> {
		return from(
			(async () => {
				const usuario = (await this.supabaseService.client.auth.getSession()).data.session?.user;
				if (!usuario) {
					return { count: 0 };
				}
				const linha = dadosOuErro(
					await this.supabaseService.client.from('chat_threads').select('user_unread_count').eq('user_id', usuario.id).maybeSingle(),
				);
				return { count: linha?.user_unread_count ?? 0 };
			})(),
		);
	}

	/** Página `page` (0 = mais recentes), entregue em ordem cronológica (antiga -> recente). */
	getMessages(userId: string, page = 0, size = 50): Observable<ChatMessagePage> {
		return from(
			this.supabaseService.client
				.from('chat_messages')
				.select('*', { count: 'exact' })
				.eq('thread_user_id', userId)
				.order('sent_at', { ascending: false })
				.range(page * size, (page + 1) * size - 1),
		).pipe(
			map((resposta) => {
				const linhas = dadosOuErro(resposta);
				const total = resposta.count ?? linhas.length;
				return {
					content: linhas.map(mensagemDaLinha).reverse(),
					totalElements: total,
					totalPages: Math.ceil(total / size),
					number: page,
					size,
				};
			}),
		);
	}

	/** Zera as não lidas do lado de quem lê. Sem conversa ainda, não há o que marcar. */
	marcarComoLida(userId: string, as: 'user' | 'admin'): Observable<void> {
		return from(
			(async () => {
				const { error } = await this.supabaseService.client.rpc('marcar_chat_lido', { p_thread_user_id: userId, p_como: as });
				if (error && error.code !== 'P0002') {
					throw error;
				}
			})(),
		);
	}
}
