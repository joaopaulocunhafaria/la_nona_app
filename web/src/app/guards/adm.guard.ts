import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { MessageService } from 'primeng/api';
import { LocalStorageService } from '../services/local-storage.service';

@Injectable({ providedIn: 'root' })
export class AdmGuard implements CanActivate {
	constructor(
		private readonly localStorageService: LocalStorageService,
		private readonly router: Router,
		private readonly messageService: MessageService,
	) {}

	canActivate(): boolean | UrlTree {
		const usuario = this.localStorageService.getUsuario();
		if (usuario?.isAdmin) {
			return true;
		}

		this.messageService.add({
			severity: 'error',
			summary: 'Acesso negado',
			detail: 'Você não tem permissão para acessar esta área.',
		});
		return this.router.createUrlTree(['/home']);
	}
}
