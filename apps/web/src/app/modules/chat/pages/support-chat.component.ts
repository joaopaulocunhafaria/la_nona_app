import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { format } from 'date-fns';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ChatMessageResponse } from '../../../services/chat.models';
import { ChatService } from '../../../services/chat.service';
import { NotificacoesService } from '../../../services/notificacoes.service';
import { mensagemErro } from '../../../utils/_metodos/supabase';

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
		private readonly notificacoesService: NotificacoesService,
	) {}

	ngOnInit(): void {
		const userIdParam = this.route.snapshot.paramMap.get('userId');
		this.isAdminView = !!userIdParam;
		this.userId = userIdParam ?? this.authService.usuario()?.id ?? '';
		this.userName = this.isAdminView ? (this.route.snapshot.queryParamMap.get('userName') ?? 'Cliente') : 'Suporte La Nona';

		this.chatService.conectar();

		this.chatService.getMessages(this.userId).subscribe({
			next: (pagina) => {
				// Mensagens que chegaram em tempo real durante o carregamento são preservadas (sem duplicar).
				const ids = new Set(pagina.content.map((mensagem) => mensagem.id));
				this.mensagens.set([...pagina.content, ...this.mensagens().filter((mensagem) => !ids.has(mensagem.id))]);
				this.carregando.set(false);
				this.marcarComoLida();
			},
			error: (erro) => {
				this.carregando.set(false);
				this.notificacoesService.erro(mensagemErro(erro, 'Não foi possível carregar as mensagens.'));
			},
		});

		this.inscricao = this.chatService.mensagensDaThread(this.userId).subscribe((mensagem) => this.adicionarMensagem(mensagem));
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

	private adicionarMensagem(mensagem: ChatMessageResponse): void {
		if (this.mensagens().some((existente) => existente.id === mensagem.id)) {
			return;
		}
		this.mensagens.set([...this.mensagens(), mensagem]);
		this.marcarComoLida();
	}

	private marcarComoLida(): void {
		this.chatService.marcarComoLida(this.userId, this.isAdminView ? 'admin' : 'user').subscribe({ error: () => undefined });
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
		this.textoMensagem.set('');
		this.chatService.enviarMensagem(this.userId, texto).subscribe({
			next: (mensagem) => this.adicionarMensagem(mensagem),
			error: (erro) => {
				this.textoMensagem.set(texto);
				this.notificacoesService.erro(mensagemErro(erro, 'Não foi possível enviar a mensagem.'));
			},
		});
	}
}
