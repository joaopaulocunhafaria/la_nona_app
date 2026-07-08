import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConfiguracoesPageComponent } from './pages/configuracoes-page.component';

const routes: Routes = [{ path: '', component: ConfiguracoesPageComponent }];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class ConfiguracoesRoutingModule {}
