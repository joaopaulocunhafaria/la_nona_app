import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdmGuard implements CanActivate {
	constructor(
		private readonly authService: AuthService,
		private readonly router: Router,
		private readonly messageService: MessageService,
	) {}

	async canActivate(): Promise<boolean | UrlTree> {
		await this.authService.sessaoPronta();
		if (this.authService.isAdmin()) {
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
