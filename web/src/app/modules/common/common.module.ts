import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { CommonRoutingModule } from './common-routing.module';
import { WelcomeComponent } from './welcome.component';
import { LoginComponent } from './login.component';
import { SplashComponent } from './splash.component';

@NgModule({
	declarations: [WelcomeComponent, LoginComponent, SplashComponent],
	imports: [
		CommonModule,
		CommonRoutingModule,
		ReactiveFormsModule,
		ButtonModule,
		InputTextModule,
		PasswordModule,
		DividerModule,
		ProgressSpinnerModule,
	],
})
export class CommonFeatureModule {}
