import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { format } from 'date-fns';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ChatMessageResponse } from '../../../services/chat.models';
import { ChatService } from '../../../services/chat.service';

@Component({
	selector: 'app-support-chat',
	standalone: false,
	templateUrl: './support-chat.component.html',
	styleUrl: './support-chat.component.scss',
})
export class SupportChatComponent implements OnInit, OnDestroy, AfterViewChecked {
	@ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

	readonly mensagens = signal<ChatMessageResponse[]>([]);
	readonly carregando = signal(true);
	readonly textoMensagem = signal('');

	userId = '';
	userName = '';
	isAdminView = false;

	private inscricao?: Subscription;
	private ultimaQuantidadeRolada = 0;

	constructor(
		private readonly route: ActivatedRoute,
		private readonly authService: AuthService,
		private readonly chatService: ChatService,
	) {}

	ngOnInit(): void {
		const userIdParam = this.route.snapshot.paramMap.get('userId');
		this.isAdminView = !!userIdParam;
		this.userId = userIdParam ?? this.authService.usuario()?.id ?? '';
		this.userName = this.isAdminView ? (this.route.snapshot.queryParamMap.get('userName') ?? 'Cliente') : 'Suporte La Nona';

		this.chatService.conectar();

		this.chatService.getMessages(this.userId).subscribe((pagina) => {
			this.mensagens.set(pagina.content);
			this.carregando.set(false);
			this.marcarComoLida();
		});

		this.inscricao = this.chatService.mensagensDaThread(this.userId).subscribe((mensagem) => {
			this.mensagens.set([...this.mensagens(), mensagem]);
			this.marcarComoLida();
		});
	}

	ngOnDestroy(): void {
		this.inscricao?.unsubscribe();
	}

	ngAfterViewChecked(): void {
		if (this.mensagens().length !== this.ultimaQuantidadeRolada && this.scrollContainer) {
			this.ultimaQuantidadeRolada = this.mensagens().length;
			this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
		}
	}

	private marcarComoLida(): void {
		this.chatService.marcarComoLida(this.userId, this.isAdminView ? 'admin' : 'user').subscribe();
	}

	ehMinha(mensagem: ChatMessageResponse): boolean {
		return (this.isAdminView && mensagem.isAdmin) || (!this.isAdminView && !mensagem.isAdmin);
	}

	horario(mensagem: ChatMessageResponse): string {
		return format(new Date(mensagem.sentAt), 'HH:mm');
	}

	enviar(): void {
		const texto = this.textoMensagem().trim();
		if (!texto) {
			return;
		}
		this.chatService.enviarMensagem(this.userId, texto);
		this.textoMensagem.set('');
	}
}
