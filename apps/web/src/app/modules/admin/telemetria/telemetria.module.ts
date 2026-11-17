import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { DatePickerModule } from 'primeng/datepicker';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';

import { SharedModule } from '../../../utils/shared.module';
import { TelemetriaPageComponent } from './pages/telemetria-page.component';
import { TelemetriaRoutingModule } from './telemetria-routing.module';

@NgModule({
	declarations: [TelemetriaPageComponent],
	imports: [
		CommonModule,
		TelemetriaRoutingModule,
		SharedModule,
		FormsModule,
		ButtonModule,
		ChartModule,
		DatePickerModule,
		ProgressSpinnerModule,
		SelectModule,
	],
})
export class TelemetriaModule {}
