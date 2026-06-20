import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID, NgModule } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BrowserModule } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { ToastModule } from 'primeng/toast';
import { provideEnvironmentNgxMask } from 'ngx-mask';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './services/auth.interceptor';
import { TemaApp } from './TemaApp';

registerLocaleData(localePt);

@NgModule({
	declarations: [AppComponent],
	imports: [BrowserModule, AppRoutingModule, ToastModule],
	providers: [
		{ provide: LOCALE_ID, useValue: 'pt' },
		{ provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
		provideAnimationsAsync(),
		provideEnvironmentNgxMask(),
		provideHttpClient(withInterceptorsFromDi()),
		{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
		MessageService,
		providePrimeNG({
			theme: {
				preset: TemaApp,
				options: { ripple: true, darkModeSelector: false },
			},
			translation: {
				accept: 'Sim',
				reject: 'Não',
				choose: 'Escolher',
				upload: 'Enviar',
				cancel: 'Cancelar',
				clear: 'Limpar',
				apply: 'Aplicar',
				today: 'Hoje',
				weekHeader: 'Sem',
				firstDayOfWeek: 0,
				dateFormat: 'dd/mm/yy',
				weak: 'Fraca',
				medium: 'Média',
				strong: 'Forte',
				passwordPrompt: 'Digite uma senha',
				emptyMessage: 'Nenhum resultado encontrado',
				emptyFilterMessage: 'Nenhum resultado encontrado',
				dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
				dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
				dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
				monthNames: [
					'Janeiro',
					'Fevereiro',
					'Março',
					'Abril',
					'Maio',
					'Junho',
					'Julho',
					'Agosto',
					'Setembro',
					'Outubro',
					'Novembro',
					'Dezembro',
				],
				monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
			},
		}),
	],
	bootstrap: [AppComponent],
})
export class AppModule {}
