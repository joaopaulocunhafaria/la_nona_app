import { Component, Input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
	selector: 'app-page-header',
	standalone: false,
	templateUrl: './page-header.component.html',
	styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
	@Input() titulo = '';
	@Input() mostrarVoltar = true;
	@Input() mostrarHome = true;

	constructor(
		private readonly location: Location,
		private readonly router: Router,
	) {}

	voltar(): void {
		this.location.back();
	}

	irParaInicio(): void {
		this.router.navigate(['/home']);
	}
}
