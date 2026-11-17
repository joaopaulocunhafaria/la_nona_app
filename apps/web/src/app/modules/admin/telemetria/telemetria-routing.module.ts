import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TelemetriaPageComponent } from './pages/telemetria-page.component';

const routes: Routes = [{ path: '', component: TelemetriaPageComponent }];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class TelemetriaRoutingModule {}
