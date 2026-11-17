import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { provideSupabaseFalso } from '../../../../testing/supabase-falso';
import { SharedModule } from '../../../utils/shared.module';
import { MenuListComponent } from './menu-list.component';

/** Linha de `menu_items` como o PostgREST devolve (categoria e imagens embutidas). */
function criarLinha(id: string, name: string, category: string) {
	return {
		id,
		name,
		description: '',
		price: 10,
		status: 'DISPONIVEL',
		category_id: `cat-${id}`,
		created_at: '',
		updated_at: '',
		menu_categories: { name: category },
		menu_item_images: [],
	};
}

describe('MenuListComponent', () => {
	let component: MenuListComponent;
	let fixture: ComponentFixture<MenuListComponent>;

	const linhas = [criarLinha('1', 'X-Burguer', 'Hamburguer'), criarLinha('2', 'Pizza Calabresa', 'Pizza'), criarLinha('3', 'Coca-Cola', 'Bebida')];

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [MenuListComponent],
			imports: [SharedModule],
			schemas: [NO_ERRORS_SCHEMA],
			providers: [
				provideSupabaseFalso({ menu_items: linhas, menu_categories: [{ name: 'Hamburguer' }, { name: 'Pizza' }, { name: 'Bebida' }] }),
				provideRouter([]),
				ConfirmationService,
				MessageService,
			],
		}).compileComponents();

		fixture = TestBed.createComponent(MenuListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();

		// ngOnInit dispara a listagem de itens e de categorias (respostas assíncronas do Supabase falso).
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('carrega itens e categorias no init', () => {
		expect(component.itens().length).toBe(3);
		expect(component.categorias()).toEqual(['Hamburguer', 'Pizza', 'Bebida']);
	});

	it('sem filtros exibe todos os itens', () => {
		expect(component.itensFiltrados().length).toBe(3);
	});

	it('filtra pela categoria selecionada', () => {
		component.selecionarCategoria('Pizza');
		expect(component.itensFiltrados().map((i) => i.name)).toEqual(['Pizza Calabresa']);
	});

	it('alterna a categoria ao clicar novamente (limpa o filtro)', () => {
		component.selecionarCategoria('Pizza');
		component.selecionarCategoria('Pizza');
		expect(component.categoriaSelecionada()).toBeNull();
		expect(component.itensFiltrados().length).toBe(3);
	});

	it('filtra por nome na busca (case-insensitive)', () => {
		component.atualizarBusca('coca');
		expect(component.itensFiltrados().map((i) => i.name)).toEqual(['Coca-Cola']);
	});

	it('quando a busca nao encontra nada, exibe todos os itens', () => {
		component.atualizarBusca('inexistente');
		expect(component.itensFiltrados().length).toBe(3);
	});

	it('combina categoria e busca, e cai para a categoria inteira quando a busca nao casa', () => {
		component.selecionarCategoria('Hamburguer');
		component.atualizarBusca('zzz');
		// busca sem resultado dentro da categoria -> mostra todos da categoria
		expect(component.itensFiltrados().map((i) => i.name)).toEqual(['X-Burguer']);
	});

	it('o arraste lateral ajusta o scrollLeft do container', () => {
		const elemento = { scrollLeft: 0 } as HTMLElement;
		component.iniciarArraste({ pageX: 100 } as MouseEvent, elemento);
		component.arrastar({ pageX: 60, preventDefault: () => {} } as MouseEvent, elemento);
		expect(elemento.scrollLeft).toBe(40);
	});
});
