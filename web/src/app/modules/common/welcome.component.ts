import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { NotificacoesService } from '../../services/notificacoes.service';

declare const google: any;

@Component({
	selector: 'app-welcome',
	standalone: false,
	templateUrl: './welcome.component.html',
	styleUrl: './welcome.component.scss',
})
export class WelcomeComponent implements OnInit, AfterViewInit {
	@ViewChild('googleButton') googleButton?: ElementRef<HTMLDivElement>;

	readonly googleLoginHabilitado = !!environment.googleClientId;
	carregandoGoogle = false;

	constructor(
		private readonly authService: AuthService,
		private readonly notificacoesService: NotificacoesService,
		private readonly router: Router,
		private readonly route: ActivatedRoute,
	) {}

	ngOnInit(): void {
		if (this.authService.isAuthenticated()) {
			this.router.navigateByUrl(this.returnUrl());
		}
	}

	ngAfterViewInit(): void {
		if (this.googleLoginHabilitado) {
			this.carregarGoogleSignIn();
		}
	}

	irParaLogin(): void {
		this.router.navigate(['/login'], { queryParams: this.route.snapshot.queryParams });
	}

	private returnUrl(): string {
		return this.route.snapshot.queryParamMap.get('returnUrl') || '/home';
	}

	private carregarGoogleSignIn(): void {
		const script = document.createElement('script');
		script.src = 'https://accounts.google.com/gsi/client';
		script.async = true;
		script.onload = () => this.inicializarGoogleSignIn();
		document.head.appendChild(script);
	}

	private inicializarGoogleSignIn(): void {
		if (typeof google === 'undefined' || !this.googleButton) {
			return;
		}

		google.accounts.id.initialize({
			client_id: environment.googleClientId,
			callback: (response: { credential: string }) => this.aoReceberCredencialGoogle(response.credential),
		});

		google.accounts.id.renderButton(this.googleButton.nativeElement, {
			theme: 'filled_black',
			size: 'large',
			width: 280,
			text: 'continue_with',
		});
	}

	private aoReceberCredencialGoogle(idToken: string): void {
		this.carregandoGoogle = true;
		this.authService.loginComGoogle({ idToken }).subscribe({
			next: () => {
				this.carregandoGoogle = false;
				this.router.navigateByUrl(this.returnUrl());
			},
			error: (erro) => {
				this.carregandoGoogle = false;
				this.notificacoesService.erro(erro?.message ?? 'Não foi possível entrar com o Google.');
			},
		});
	}
}
