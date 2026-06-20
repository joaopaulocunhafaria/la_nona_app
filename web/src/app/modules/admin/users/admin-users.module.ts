import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimeTemplate } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { SharedModule } from '../../../utils/shared.module';
import { AdminUsersRoutingModule } from './admin-users-routing.module';
import { UserManagementComponent } from './pages/user-management.component';

@NgModule({
	declarations: [UserManagementComponent],
	imports: [
		CommonModule,
		AdminUsersRoutingModule,
		SharedModule,
		FormsModule,
		AvatarModule,
		ButtonModule,
		DialogModule,
		ProgressSpinnerModule,
		SelectModule,
		TagModule,
		PrimeTemplate,
	],
})
export class AdminUsersModule {}
