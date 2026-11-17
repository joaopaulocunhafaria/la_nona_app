import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { format } from 'date-fns';
import { Subscription } from 'rxjs';
import { ChatThreadResponse } from '../../../services/chat.models';
import { ChatService } from '../../../services/chat.service';

@Component({
	selector: 'app-admin-chat-list',
	standalone: false,
	templateUrl: './admin-chat-list.component.html',
	styleUrl: './admin-chat-list.component.scss',
})
export class AdminChatListComponent implements OnInit, OnDestroy {
	readonly threads = signal<ChatThreadResponse[]>([]);
	readonly carregando = signal(true);

	private inscricao?: Subscription;

	constructor(
		private readonly chatService: ChatService,
		private readonly router: Router,
	) {}

	ngOnInit(): void {
		this.chatService.conectar();
		this.carregarThreads();

		this.inscricao = this.chatService.atualizacoesDeThreadsAdmin().subscribe(() => this.carregarThreads());
	}

	ngOnDestroy(): void {
		this.inscricao?.unsubscribe();
	}

	private carregarThreads(): void {
		this.chatService.getThreads().subscribe({
			next: (threads) => {
				this.threads.set(threads);
				this.carregando.set(false);
			},
			error: () => this.carregando.set(false),
		});
	}

	horario(thread: ChatThreadResponse): string {
		return format(new Date(thread.updatedAt), 'HH:mm');
	}

	inicial(thread: ChatThreadResponse): string {
		return thread.userName.charAt(0).toUpperCase();
	}

	abrirConversa(thread: ChatThreadResponse): void {
		this.router.navigate(['/chat/admin', thread.userId], { queryParams: { userName: thread.userName } });
	}
}
