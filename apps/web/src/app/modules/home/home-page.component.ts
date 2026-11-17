import { Component, OnInit, Signal, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { NotificacoesService } from '../../services/notificacoes.service';
import { UsuarioService } from '../../services/usuario.service';
import { UsuarioResponse } from '../../services/auth.models';

@Component({
	selector: 'app-home-page',
	standalone: false,
	templateUrl: './home-page.component.html',
	styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnInit {
	readonly usuario = signal<UsuarioResponse | null>(null);
	readonly carregandoFoto = signal(false);
	readonly modalEnderecoVisivel = signal(false);
	readonly isFirstAccess = signal(false);
	readonly unreadCount = signal(0);
	readonly unreadLabel = computed(() => (this.unreadCount() > 99 ? '99+' : `${this.unreadCount()}`));

	readonly isAuthenticated: Signal<boolean>;
	readonly isAdmin = computed(() => this.usuario()?.isAdmin ?? false);
	readonly enderecoFormatado = computed(() => {
		const endereco = this.usuario()?.address;
		if (!endereco?.rua) {
			return null;
		}
		const complemento = endereco.complemento ? ` (${endereco.complemento})` : '';
		return `${endereco.rua}, ${endereco.numero} - ${endereco.bairro}, ${endereco.cidade}/${endereco.estado}. CEP: ${endereco.cep}${complemento}`;
	});

	constructor(
		private readonly authService: AuthService,
		private readonly usuarioService: UsuarioService,
		private readonly chatService: ChatService,
		private readonly notificacoesService: NotificacoesService,
		private readonly confirmationService: ConfirmationService,
		private readonly router: Router,
	) {
		this.isAuthenticated = this.authService.isAuthenticated;
	}

	ngOnInit(): void {
		if (!this.isAuthenticated()) {
			return;
		}

		this.usuarioService.getMe().subscribe((usuario) => {
			this.usuario.set(usuario);
			if (!usuario.onboardingCompleted) {
				this.isFirstAccess.set(true);
				this.modalEnderecoVisivel.set(true);
			}
		});

		this.chatService.conectar();
		this.atualizarContagemNaoLidas();
	}

	private atualizarContagemNaoLidas(): void {
		if (this.isAdmin()) {
			this.chatService.getTotalUnreadCountAdmin().subscribe((resultado) => this.unreadCount.set(resultado.total));
		} else {
			this.chatService.getMyUnreadCount().subscribe((resultado) => this.unreadCount.set(resultado.count));
		}
	}

	abrirChat(): void {
		this.router.navigate([this.isAdmin() ? '/chat/admin' : '/chat']);
	}

	abrirEnderecoModal(): void {
		this.isFirstAccess.set(false);
		this.modalEnderecoVisivel.set(true);
	}

	aoSalvarEndereco(usuario: UsuarioResponse): void {
		this.usuario.set(usuario);
	}

	selecionarFoto(input: HTMLInputElement): void {
		input.click();
	}

	aoSelecionarArquivo(event: Event): void {
		const input = event.target as HTMLInputElement;
		const arquivo = input.files?.[0];
		if (!arquivo) {
			return;
		}

		const leitor = new FileReader();
		leitor.onload = () => {
			const resultado = leitor.result as string;
			const [, base64] = resultado.split(',');
			this.carregandoFoto.set(true);
			this.usuarioService.atualizarFoto({ imageBase64: base64, contentType: arquivo.type }).subscribe({
				next: (usuario) => {
					this.usuario.set(usuario);
					this.carregandoFoto.set(false);
					this.notificacoesService.sucesso('Foto de perfil atualizada!');
				},
				error: (erro) => {
					this.carregandoFoto.set(false);
					this.notificacoesService.erro(erro?.message ?? 'Erro ao atualizar foto.');
				},
			});
		};
		leitor.readAsDataURL(arquivo);
		input.value = '';
	}

	irPara(rota: string): void {
		this.router.navigate([rota]);
	}

	irParaLogin(): void {
		this.router.navigate(['/welcome'], { queryParams: { returnUrl: '/home' } });
	}

	sair(): void {
		this.confirmationService.confirm({
			header: 'Confirmar Logout',
			message: 'Tem certeza que deseja sair da sua conta?',
			acceptLabel: 'Sair',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				this.chatService.desconectar();
				this.authService.logout();
				this.router.navigate(['/']);
			},
		});
	}
}
