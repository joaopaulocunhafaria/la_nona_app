import { HttpErrorResponse, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { LocalStorageService } from './local-storage.service';
import { NotificacoesService } from './notificacoes.service';

const ROTAS_SEM_AUTH = ['/auth/login', '/auth/register', '/auth/google', '/auth/refresh'];

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
	constructor(
		private readonly localStorageService: LocalStorageService,
		private readonly notificacoesService: NotificacoesService,
		private readonly router: Router,
	) {}

	intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<any> {
		const ignorarAuth = ROTAS_SEM_AUTH.some((rota) => request.url.includes(rota));
		const token = this.localStorageService.getToken();

		const requisicao = !ignorarAuth && token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

		return next.handle(requisicao).pipe(
			catchError((error: HttpErrorResponse) => {
				if (!ignorarAuth && (error.status === 401 || error.status === 403) && token) {
					const returnUrl = this.router.url;
					this.localStorageService.clear();
					this.notificacoesService.info('Sua sessão expirou. Faça login novamente.', 'Login necessário');
					this.router.navigate(['/login'], { queryParams: { returnUrl } });
				}
				// Normaliza o erro para .message: a mensagem amigavel do backend chega em error.error.message,
				// mas todo consumidor deve ler so erro?.message a partir daqui.
				return throwError(() => ({ message: (error.error as { message?: string } | null)?.message }));
			}),
		);
	}
}
