import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login.component';
import { SplashComponent } from './splash.component';
import { WelcomeComponent } from './welcome.component';

const routes: Routes = [
	{ path: '', component: SplashComponent },
	{ path: 'welcome', component: WelcomeComponent },
	{ path: 'login', component: LoginComponent },
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class CommonRoutingModule {}
