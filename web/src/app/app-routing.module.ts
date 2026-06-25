import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdmGuard } from './guards/adm.guard';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
	{ path: '', loadChildren: () => import('./modules/common/common.module').then((m) => m.CommonFeatureModule) },
	{
		path: 'home',
		loadChildren: () => import('./modules/home/home.module').then((m) => m.HomeModule),
	},
	{
		path: 'menu',
		loadChildren: () => import('./modules/menu/menu.module').then((m) => m.MenuModule),
	},
	{
		path: 'cart',
		loadChildren: () => import('./modules/cart/cart.module').then((m) => m.CartModule),
		canActivate: [AuthGuard],
	},
	{
		path: 'favorites',
		loadChildren: () => import('./modules/favorites/favorites.module').then((m) => m.FavoritesModule),
		canActivate: [AuthGuard],
	},
	{
		path: 'chat',
		loadChildren: () => import('./modules/chat/chat.module').then((m) => m.ChatModule),
		canActivate: [AuthGuard],
	},
	{
		path: 'admin/users',
		loadChildren: () => import('./modules/admin/users/admin-users.module').then((m) => m.AdminUsersModule),
		canActivate: [AuthGuard, AdmGuard],
	},
	{
		path: 'admin/telemetria',
		loadChildren: () => import('./modules/admin/telemetria/telemetria.module').then((m) => m.TelemetriaModule),
		canActivate: [AuthGuard, AdmGuard],
	},
	{ path: '**', redirectTo: '' },
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule],
})
export class AppRoutingModule {}
