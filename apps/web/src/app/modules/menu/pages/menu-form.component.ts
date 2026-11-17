import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificacoesService } from '../../../services/notificacoes.service';
import { mensagemErro } from '../../../utils/_metodos/supabase';
import { MenuCategory } from '../_modelos/menu-category.model';
import { MenuItemImage, MenuItemImageRequest, MenuItemStatus, STATUS_OPTIONS } from '../_modelos/menu-item.model';
import { MenuCategoryService } from '../_services/menu-category.service';
import { MenuItemService } from '../_services/menu-item.service';

interface NovaImagem {
	arquivo: File;
	previewUrl: string;
}

@Component({
	selector: 'app-menu-form',
	standalone: false,
	templateUrl: './menu-form.component.html',
	styleUrl: './menu-form.component.scss',
})
export class MenuFormComponent implements OnInit {
	readonly categorias = signal<MenuCategory[]>([]);
	readonly carregando = signal(false);
	readonly salvando = signal(false);
	readonly imagensExistentes = signal<MenuItemImage[]>([]);
	readonly novasImagens = signal<NovaImagem[]>([]);
	readonly statusOptions = STATUS_OPTIONS;

	itemId: string | null = null;

	readonly form = new FormGroup({
		name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
		description: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
		price: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0.01)] }),
		category: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
		status: new FormControl<MenuItemStatus>('DISPONIVEL', { nonNullable: true, validators: [Validators.required] }),
	});

	get titulo(): string {
		return this.itemId ? 'Editar Item' : 'Adicionar Item';
	}

	constructor(
		private readonly route: ActivatedRoute,
		private readonly router: Router,
		private readonly menuItemService: MenuItemService,
		private readonly menuCategoryService: MenuCategoryService,
		private readonly notificacoesService: NotificacoesService,
	) {}

	ngOnInit(): void {
		this.menuCategoryService.listar().subscribe({
			next: (categorias) => this.categorias.set(categorias),
			error: () => this.notificacoesService.erro('Não foi possível carregar as categorias.'),
		});

		this.itemId = this.route.snapshot.paramMap.get('id');
		if (this.itemId) {
			this.carregando.set(true);
			this.menuItemService.buscarPorId(this.itemId).subscribe((item) => {
				this.form.patchValue({
					name: item.name,
					description: item.description,
					price: item.price,
					category: item.categoryId,
					status: item.status,
				});
				this.imagensExistentes.set([...item.images].sort((a, b) => a.position - b.position));
				this.carregando.set(false);
			});
		}
	}

	removerImagemExistente(imagem: MenuItemImage): void {
		this.imagensExistentes.set(this.imagensExistentes().filter((i) => i.id !== imagem.id));
	}

	removerNovaImagem(novaImagem: NovaImagem): void {
		this.novasImagens.set(this.novasImagens().filter((i) => i !== novaImagem));
	}

	aoSelecionarArquivos(event: Event): void {
		const input = event.target as HTMLInputElement;
		const arquivos = Array.from(input.files ?? []);

		const novas = arquivos.map((arquivo) => ({ arquivo, previewUrl: URL.createObjectURL(arquivo) }));
		this.novasImagens.set([...this.novasImagens(), ...novas]);
		input.value = '';
	}

	salvar(): void {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		const totalImagens = this.imagensExistentes().length + this.novasImagens().length;
		if (totalImagens === 0) {
			this.notificacoesService.erro('Adicione ao menos uma imagem.');
			return;
		}

		this.salvando.set(true);
		const { name, description, price, category, status } = this.form.getRawValue();
		const request = { name, description, price: price!, category, status, images: this.imagensDoFormulario() };

		const requisicao$ = this.itemId ? this.menuItemService.atualizar(this.itemId, request) : this.menuItemService.criar(request);

		requisicao$.subscribe({
			next: () => {
				this.salvando.set(false);
				this.notificacoesService.sucesso(this.itemId ? 'Item atualizado com sucesso!' : 'Item adicionado com sucesso!');
				this.router.navigate(['/menu']);
			},
			error: (erro) => {
				this.salvando.set(false);
				this.notificacoesService.erro(mensagemErro(erro, 'Não foi possível salvar o item.'));
			},
		});
	}

	private imagensDoFormulario(): MenuItemImageRequest[] {
		// Imagens já armazenadas são mantidas pela URL (sem reenviar o arquivo);
		// as novas vão como File para o serviço comprimir e enviar ao bucket.
		const existentes: MenuItemImageRequest[] = this.imagensExistentes().map((imagem) => ({ url: imagem.url, storagePath: imagem.storagePath }));
		const novas: MenuItemImageRequest[] = this.novasImagens().map((nova) => ({ arquivo: nova.arquivo }));
		return [...existentes, ...novas];
	}
}
