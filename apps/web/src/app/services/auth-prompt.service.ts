import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { NotificacoesService } from './notificacoes.service';

@Injectable({ providedIn: 'root' })
export class AuthPromptService {
	constructor(
		private readonly authService: AuthService,
		private readonly notificacoesService: NotificacoesService,
		private readonly router: Router,
	) {}

	requererLogin(): boolean {
		if (this.authService.isAuthenticated()) {
			return true;
		}

		this.notificacoesService.info('Faça login para continuar.', 'Login necessário');
		this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
		return false;
	}
}
