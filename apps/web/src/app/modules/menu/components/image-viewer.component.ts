import { AfterViewInit, Component, ElementRef, computed, input, linkedSignal, output, signal, viewChild } from '@angular/core';

const DISTANCIA_MINIMA_TROCA = 50;
const RESISTENCIA_NA_BORDA = 3;

@Component({
	selector: 'app-image-viewer',
	standalone: false,
	templateUrl: './image-viewer.component.html',
	styleUrl: './image-viewer.component.scss',
})
export class ImageViewerComponent implements AfterViewInit {
	readonly imagens = input.required<string[]>();
	readonly indiceInicial = input(0);
	readonly descricao = input('');
	readonly fechado = output<void>();

	readonly indice = linkedSignal(() => this.indiceInicial());
	readonly deslocamento = signal(0);
	readonly arrastando = signal(false);
	readonly transformacao = computed(() => `translateX(calc(${-this.indice() * 100}% + ${this.deslocamento()}px))`);

	private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
	private posicaoInicial = 0;

	ngAfterViewInit(): void {
		this.dialogo().nativeElement.showModal();
	}

	fechar(): void {
		this.dialogo().nativeElement.close();
	}

	fecharAoClicarFora(event: MouseEvent): void {
		if (event.target === this.dialogo().nativeElement) {
			this.fechar();
		}
	}

	anterior(): void {
		this.indice.update((indice) => Math.max(indice - 1, 0));
	}

	proxima(): void {
		this.indice.update((indice) => Math.min(indice + 1, this.imagens().length - 1));
	}

	iniciarArraste(event: PointerEvent): void {
		if (!event.isPrimary || event.button !== 0) {
			return;
		}
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		this.posicaoInicial = event.clientX;
		this.arrastando.set(true);
	}

	arrastar(event: PointerEvent): void {
		if (!this.arrastando() || !event.isPrimary) {
			return;
		}
		const distancia = event.clientX - this.posicaoInicial;
		const semVizinha = distancia > 0 ? this.indice() === 0 : this.indice() === this.imagens().length - 1;
		this.deslocamento.set(semVizinha ? distancia / RESISTENCIA_NA_BORDA : distancia);
	}

	finalizarArraste(event: PointerEvent): void {
		if (!this.arrastando() || !event.isPrimary) {
			return;
		}
		const distancia = event.clientX - this.posicaoInicial;
		this.cancelarArraste();
		if (distancia <= -DISTANCIA_MINIMA_TROCA) {
			this.proxima();
		} else if (distancia >= DISTANCIA_MINIMA_TROCA) {
			this.anterior();
		}
	}

	cancelarArraste(): void {
		this.arrastando.set(false);
		this.deslocamento.set(0);
	}
}
