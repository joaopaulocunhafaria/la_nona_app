import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdmGuard } from '../../guards/adm.guard';
import { MenuDetailComponent } from './pages/menu-detail.component';
import { MenuFormComponent } from './pages/menu-form.component';
import { MenuListComponent } from './pages/menu-list.component';

const routes: Routes = [
	{ path: '', component: MenuListComponent },
	{ path: 'new', component: MenuFormComponent, canActivate: [AdmGuard] },
	{ path: ':id', component: MenuDetailComponent },
	{ path: ':id/edit', component: MenuFormComponent, canActivate: [AdmGuard] },
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class MenuRoutingModule {}
