import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { NotificacoesService } from '../../../../services/notificacoes.service';
import { MenuCategory } from '../../../menu/_modelos/menu-category.model';
import { MenuCategoryService } from '../../../menu/_services/menu-category.service';

@Component({
	selector: 'app-configuracoes-page',
	standalone: false,
	templateUrl: './configuracoes-page.component.html',
	styleUrl: './configuracoes-page.component.scss',
})
export class ConfiguracoesPageComponent implements OnInit {
	readonly categorias = signal<MenuCategory[]>([]);
	readonly carregando = signal(true);
	readonly salvando = signal(false);
	readonly novaCategoria = signal('');

	constructor(
		private readonly menuCategoryService: MenuCategoryService,
		private readonly notificacoesService: NotificacoesService,
		private readonly confirmationService: ConfirmationService,
	) {}

	ngOnInit(): void {
		this.carregarCategorias();
	}

	private carregarCategorias(): void {
		this.carregando.set(true);
		this.menuCategoryService.listar().subscribe({
			next: (categorias) => {
				this.categorias.set(categorias);
				this.carregando.set(false);
			},
			error: () => this.carregando.set(false),
		});
	}

	adicionar(): void {
		const nome = this.novaCategoria().trim();
		if (!nome) {
			this.notificacoesService.erro('Informe o nome da categoria.');
			return;
		}

		this.salvando.set(true);
		this.menuCategoryService.criar({ name: nome }).subscribe({
			next: (categoria) => {
				this.salvando.set(false);
				this.novaCategoria.set('');
				this.categorias.set([...this.categorias(), categoria].sort((a, b) => a.name.localeCompare(b.name)));
				this.notificacoesService.sucesso('Categoria cadastrada com sucesso!');
			},
			error: (erro) => {
				this.salvando.set(false);
				this.notificacoesService.erro(erro?.message ?? 'Não foi possível cadastrar a categoria.');
			},
		});
	}

	excluir(categoria: MenuCategory): void {
		if (categoria.itemCount > 0) {
			this.notificacoesService.erro('Não é possível excluir uma categoria com itens vinculados.');
			return;
		}

		this.confirmationService.confirm({
			header: 'Excluir categoria',
			message: `Tem certeza que deseja excluir "${categoria.name}"?`,
			acceptLabel: 'Excluir',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				this.menuCategoryService.excluir(categoria.id).subscribe({
					next: () => {
						this.categorias.set(this.categorias().filter((c) => c.id !== categoria.id));
						this.notificacoesService.sucesso('Categoria excluída com sucesso.');
					},
					error: (erro) => this.notificacoesService.erro(erro?.message ?? 'Não foi possível excluir a categoria.'),
				});
			},
		});
	}
}
