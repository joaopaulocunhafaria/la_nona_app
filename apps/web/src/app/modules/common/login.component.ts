import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificacoesService } from '../../services/notificacoes.service';

@Component({
	selector: 'app-login',
	standalone: false,
	templateUrl: './login.component.html',
	styleUrl: './login.component.scss',
})
export class LoginComponent {
	readonly modoRegistro = signal(false);
	readonly carregando = signal(false);

	readonly form = new FormGroup({
		name: new FormControl<string>(''),
		email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
		password: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
	});

	constructor(
		private readonly authService: AuthService,
		private readonly notificacoesService: NotificacoesService,
		private readonly router: Router,
		private readonly route: ActivatedRoute,
	) {}

	alternarModo(): void {
		this.modoRegistro.set(!this.modoRegistro());
		this.form.reset({ name: '', email: '', password: '' });
	}

	voltar(): void {
		this.router.navigate(['/']);
	}

	submeter(): void {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		const { name, email, password } = this.form.getRawValue();
		this.carregando.set(true);

		const requisicao$ = this.modoRegistro()
			? this.authService.registrar({ email, password, name: name || undefined })
			: this.authService.login({ email, password });

		requisicao$.subscribe({
			next: () => {
				this.carregando.set(false);
				const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/home';
				this.router.navigateByUrl(returnUrl);
			},
			error: (erro) => {
				this.carregando.set(false);
				console.error('Erro ao autenticar:', erro);
				this.notificacoesService.erro(erro?.message ?? 'Não foi possível concluir a operação.');
			},
		});
	}
}
