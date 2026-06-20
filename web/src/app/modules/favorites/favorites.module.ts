import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { SharedModule } from '../../utils/shared.module';
import { FavoritesRoutingModule } from './favorites-routing.module';
import { FavoritesPageComponent } from './pages/favorites-page.component';

@NgModule({
	declarations: [FavoritesPageComponent],
	imports: [CommonModule, FavoritesRoutingModule, SharedModule, ProgressSpinnerModule],
})
export class FavoritesModule {}
