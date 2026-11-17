import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

const SPLASH_DURATION_MS = 2200;

@Component({
	selector: 'app-splash',
	standalone: false,
	templateUrl: './splash.component.html',
	styleUrl: './splash.component.scss',
})
export class SplashComponent implements OnInit, OnDestroy {
	private timeoutId?: ReturnType<typeof setTimeout>;

	constructor(private readonly router: Router) {}

	ngOnInit(): void {
		this.timeoutId = setTimeout(() => this.router.navigate(['/home']), SPLASH_DURATION_MS);
	}

	ngOnDestroy(): void {
		clearTimeout(this.timeoutId);
	}
}
