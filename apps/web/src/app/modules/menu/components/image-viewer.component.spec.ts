import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageViewerComponent } from './image-viewer.component';

describe('ImageViewerComponent', () => {
	let fixture: ComponentFixture<ImageViewerComponent>;
	let component: ImageViewerComponent;

	beforeEach(async () => {
		await TestBed.configureTestingModule({ declarations: [ImageViewerComponent] }).compileComponents();
		fixture = TestBed.createComponent(ImageViewerComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('imagens', ['data:,a', 'data:,b', 'data:,c']);
		fixture.componentRef.setInput('indiceInicial', 1);
		fixture.detectChanges();
	});

	function arrastar(distancia: number, fim: 'pointerup' | 'pointercancel' = 'pointerup'): void {
		const area: HTMLElement = fixture.nativeElement.querySelector('.area-arraste');
		spyOn(area, 'setPointerCapture');
		const emitir = (tipo: string, clientX: number) =>
			area.dispatchEvent(new PointerEvent(tipo, { isPrimary: true, button: 0, pointerId: 1, clientX }));
		emitir('pointerdown', 200);
		emitir('pointermove', 200 + distancia);
		emitir(fim, 200 + distancia);
		fixture.detectChanges();
	}

	it('abre na imagem clicada', () => {
		expect(fixture.nativeElement.querySelector('dialog').open).toBeTrue();
		expect(component.indice()).toBe(1);
	});

	it('arrastar para a esquerda mostra a próxima', () => {
		arrastar(-120);
		expect(component.indice()).toBe(2);
	});

	it('arrastar para a direita mostra a anterior', () => {
		arrastar(120);
		expect(component.indice()).toBe(0);
	});

	it('arraste curto mantém a imagem', () => {
		arrastar(-20);
		expect(component.indice()).toBe(1);
		expect(component.deslocamento()).toBe(0);
	});

	it('arraste cancelado mantém a imagem', () => {
		arrastar(-120, 'pointercancel');
		expect(component.indice()).toBe(1);
		expect(component.deslocamento()).toBe(0);
	});

	it('não passa da última nem da primeira imagem', () => {
		component.proxima();
		component.proxima();
		expect(component.indice()).toBe(2);
		component.anterior();
		component.anterior();
		component.anterior();
		expect(component.indice()).toBe(0);
	});

	it('o botão X fecha e avisa o pai', async () => {
		const fechado = new Promise<void>((resolve) => component.fechado.subscribe(() => resolve()));
		fixture.nativeElement.querySelector('[aria-label="Fechar imagem"]').click();
		await fechado;
		expect(fixture.nativeElement.querySelector('dialog').open).toBeFalse();
	});
});
