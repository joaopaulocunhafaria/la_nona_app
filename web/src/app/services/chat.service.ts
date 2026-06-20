import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { ChatMessagePage, ChatMessageResponse, ChatThreadResponse } from './chat.models';
import { LocalStorageService } from './local-storage.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
	private readonly baseUrl = `${environment.apiUrl}/chat`;
	private client: Client | null = null;
	private readonly threadSubjects = new Map<string, Subject<ChatMessageResponse>>();
	private readonly adminThreadsSubject = new Subject<ChatThreadResponse>();
	private readonly aoConectarFila: Array<() => void> = [];

	readonly conectado = signal(false);

	constructor(
		private readonly http: HttpClient,
		private readonly localStorageService: LocalStorageService,
	) {}

	conectar(): void {
		if (this.client?.active) {
			return;
		}

		const token = this.localStorageService.getToken();
		if (!token) {
			return;
		}

		this.client = new Client({
			webSocketFactory: () => new SockJS(environment.wsUrl),
			connectHeaders: { Authorization: `Bearer ${token}` },
			reconnectDelay: 5000,
			onConnect: () => {
				this.conectado.set(true);
				this.client?.subscribe('/topic/chat.admin.threads', (message: IMessage) => {
					this.adminThreadsSubject.next(JSON.parse(message.body) as ChatThreadResponse);
				});
				this.aoConectarFila.splice(0).forEach((acao) => acao());
			},
			onDisconnect: () => this.conectado.set(false),
			onWebSocketClose: () => this.conectado.set(false),
		});

		this.client.activate();
	}

	desconectar(): void {
		this.client?.deactivate();
		this.client = null;
		this.conectado.set(false);
		this.threadSubjects.clear();
		this.aoConectarFila.length = 0;
	}

	private executarQuandoConectado(acao: () => void): void {
		if (this.client?.connected) {
			acao();
		} else {
			this.aoConectarFila.push(acao);
		}
	}

	mensagensDaThread(userId: string): Observable<ChatMessageResponse> {
		if (!this.threadSubjects.has(userId)) {
			this.threadSubjects.set(userId, new Subject<ChatMessageResponse>());
			this.executarQuandoConectado(() => {
				this.client?.subscribe(`/topic/chat.${userId}`, (message: IMessage) => {
					this.threadSubjects.get(userId)?.next(JSON.parse(message.body) as ChatMessageResponse);
				});
			});
		}
		return this.threadSubjects.get(userId)!.asObservable();
	}

	atualizacoesDeThreadsAdmin(): Observable<ChatThreadResponse> {
		return this.adminThreadsSubject.asObservable();
	}

	enviarMensagem(userId: string, text: string): void {
		this.executarQuandoConectado(() => {
			this.client?.publish({
				destination: `/app/chat.${userId}.send`,
				body: JSON.stringify({ text }),
			});
		});
	}

	getThreads(): Observable<ChatThreadResponse[]> {
		return this.http.get<ChatThreadResponse[]>(`${this.baseUrl}/threads`);
	}

	getTotalUnreadCountAdmin(): Observable<{ total: number }> {
		return this.http.get<{ total: number }>(`${this.baseUrl}/threads/unread-count`);
	}

	getMyUnreadCount(): Observable<{ count: number }> {
		return this.http.get<{ count: number }>(`${this.baseUrl}/my-thread/unread-count`);
	}

	getMessages(userId: string, page = 0, size = 50): Observable<ChatMessagePage> {
		return this.http.get<ChatMessagePage>(`${this.baseUrl}/threads/${userId}/messages`, {
			// O backend ja entrega a pagina em ordem cronologica (mais antiga ->
			// mais recente); nao enviamos sort para nao conflitar com esse
			// ordenamento aplicado no servidor.
			params: { page, size },
		});
	}

	marcarComoLida(userId: string, as: 'user' | 'admin'): Observable<void> {
		return this.http.put<void>(`${this.baseUrl}/threads/${userId}/read`, null, { params: { as } });
	}
}
