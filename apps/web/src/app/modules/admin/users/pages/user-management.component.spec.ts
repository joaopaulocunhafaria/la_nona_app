import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { UserManagementComponent } from './user-management.component';
import { provideSupabaseFalso } from '../../../../../testing/supabase-falso';

describe('UserManagementComponent', () => {
	let component: UserManagementComponent;
	let fixture: ComponentFixture<UserManagementComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			schemas: [NO_ERRORS_SCHEMA],
			declarations: [UserManagementComponent],
			providers: [provideSupabaseFalso(), provideRouter([]), MessageService],
		}).compileComponents();

		fixture = TestBed.createComponent(UserManagementComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
