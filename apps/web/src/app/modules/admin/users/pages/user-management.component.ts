import { Component, OnInit, computed, signal } from '@angular/core';
import { UsuarioResponse, UsuarioRole } from '../../../../services/auth.models';
import { NotificacoesService } from '../../../../services/notificacoes.service';
import { ROLES_USUARIO } from '../../../../utils/_constantes/constantes';
import { AdminUserService } from '../_services/admin-user.service';

@Component({
	selector: 'app-user-management',
	standalone: false,
	templateUrl: './user-management.component.html',
	styleUrl: './user-management.component.scss',
})
export class UserManagementComponent implements OnInit {
	readonly roles = ROLES_USUARIO;
	readonly usuarios = signal<UsuarioResponse[]>([]);
	readonly carregando = signal(true);
	readonly termoBusca = signal('');
	readonly usuarioSelecionado = signal<UsuarioResponse | null>(null);
	readonly roleSelecionada = signal<UsuarioRole | null>(null);
	readonly salvando = signal(false);
	readonly modalVisivel = signal(false);

	readonly usuariosFiltrados = computed(() => {
		const termo = this.termoBusca().trim().toLowerCase();
		if (!termo) {
			return this.usuarios();
		}
		return this.usuarios().filter((usuario) => usuario.name.toLowerCase().includes(termo) || usuario.email.toLowerCase().includes(termo));
	});

	constructor(
		private readonly adminUserService: AdminUserService,
		private readonly notificacoesService: NotificacoesService,
	) {}

	ngOnInit(): void {
		this.carregarUsuarios();
	}

	private carregarUsuarios(): void {
		this.adminUserService.listar().subscribe({
			next: (usuarios) => {
				this.usuarios.set(usuarios);
				this.carregando.set(false);
			},
			error: () => this.carregando.set(false),
		});
	}

	corDaRole(role: UsuarioRole): 'danger' | 'info' | 'success' {
		if (role === 'admin') {
			return 'danger';
		}
		if (role === 'entregador') {
			return 'info';
		}
		return 'success';
	}

	enderecoFormatado(usuario: UsuarioResponse): string | null {
		const endereco = usuario.address;
		if (!usuario.onboardingCompleted || !endereco?.rua) {
			return null;
		}
		const complemento = endereco.complemento ? ` (${endereco.complemento})` : '';
		return `${endereco.rua}, ${endereco.numero} - ${endereco.bairro}, ${endereco.cidade}/${endereco.estado}. CEP: ${endereco.cep}${complemento}`;
	}

	abrirDetalhe(usuario: UsuarioResponse): void {
		this.usuarioSelecionado.set(usuario);
		this.roleSelecionada.set(usuario.role);
		this.modalVisivel.set(true);
	}

	salvar(): void {
		const usuario = this.usuarioSelecionado();
		const novaRole = this.roleSelecionada();
		if (!usuario || !novaRole) {
			return;
		}

		if (novaRole === usuario.role) {
			this.modalVisivel.set(false);
			return;
		}

		this.salvando.set(true);
		this.adminUserService.atualizarRole(usuario.id, novaRole).subscribe({
			next: (atualizado) => {
				this.salvando.set(false);
				this.modalVisivel.set(false);
				this.usuarios.set(this.usuarios().map((u) => (u.id === atualizado.id ? atualizado : u)));
				this.notificacoesService.sucesso('Cargo atualizado com sucesso!');
			},
			error: (erro) => {
				this.salvando.set(false);
				this.notificacoesService.erro(erro?.message ?? 'Não foi possível atualizar o cargo.');
			},
		});
	}
}
