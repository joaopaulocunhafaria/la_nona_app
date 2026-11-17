import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';

import { SharedModule } from '../../../utils/shared.module';
import { ConfiguracoesRoutingModule } from './configuracoes-routing.module';
import { ConfiguracoesPageComponent } from './pages/configuracoes-page.component';

@NgModule({
	declarations: [ConfiguracoesPageComponent],
	imports: [
		CommonModule,
		ConfiguracoesRoutingModule,
		SharedModule,
		FormsModule,
		ButtonModule,
		ConfirmDialogModule,
		InputTextModule,
		ProgressSpinnerModule,
		TooltipModule,
	],
	providers: [ConfirmationService],
})
export class ConfiguracoesModule {}
