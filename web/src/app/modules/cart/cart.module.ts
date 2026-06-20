import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { SharedModule } from '../../utils/shared.module';
import { CartRoutingModule } from './cart-routing.module';
import { CartPageComponent } from './pages/cart-page.component';

@NgModule({
	declarations: [CartPageComponent],
	imports: [CommonModule, CartRoutingModule, SharedModule, ButtonModule, ProgressSpinnerModule],
})
export class CartModule {}
