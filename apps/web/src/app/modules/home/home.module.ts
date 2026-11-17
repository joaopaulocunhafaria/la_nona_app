import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { PrimeTemplate } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { SharedModule } from '../../utils/shared.module';
import { AddressModalComponent } from './address-modal.component';
import { HomePageComponent } from './home-page.component';
import { HomeRoutingModule } from './home-routing.module';

@NgModule({
	declarations: [HomePageComponent, AddressModalComponent],
	imports: [
		CommonModule,
		HomeRoutingModule,
		SharedModule,
		ReactiveFormsModule,
		AvatarModule,
		BadgeModule,
		ButtonModule,
		ConfirmDialogModule,
		DialogModule,
		InputTextModule,
		ProgressSpinnerModule,
		PrimeTemplate,
	],
	providers: [ConfirmationService],
})
export class HomeModule {}
