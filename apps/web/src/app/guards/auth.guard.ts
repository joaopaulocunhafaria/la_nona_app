import { Injectable } from '@angular/core';
import { CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { LocalStorageService } from '../services/local-storage.service';
import { NotificacoesService } from '../services/notificacoes.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
	constructor(
		private readonly localStorageService: LocalStorageService,
		private readonly notificacoesService: NotificacoesService,
		private readonly router: Router,
	) {}

	canActivate(_: unknown, state: RouterStateSnapshot): boolean | UrlTree {
		if (this.localStorageService.getToken()) {
			return true;
		}

		this.notificacoesService.info('Faça login para continuar.', 'Login necessário');
		return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
	}
}
