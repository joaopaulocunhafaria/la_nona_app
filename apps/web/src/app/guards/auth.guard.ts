import { Injectable } from '@angular/core';
import { CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificacoesService } from '../services/notificacoes.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
	constructor(
		private readonly authService: AuthService,
		private readonly notificacoesService: NotificacoesService,
		private readonly router: Router,
	) {}

	async canActivate(_: unknown, state: RouterStateSnapshot): Promise<boolean | UrlTree> {
		await this.authService.sessaoPronta();
		if (this.authService.isAuthenticated()) {
			return true;
		}

		this.notificacoesService.info('Faça login para continuar.', 'Login necessário');
		return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
	}
}
