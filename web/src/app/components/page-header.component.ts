import { Component, Input } from '@angular/core';
import { Location } from '@angular/common';

@Component({
	selector: 'app-page-header',
	standalone: false,
	templateUrl: './page-header.component.html',
	styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
	@Input() titulo = '';
	@Input() mostrarVoltar = true;

	constructor(private readonly location: Location) {}

	voltar(): void {
		this.location.back();
	}
}
