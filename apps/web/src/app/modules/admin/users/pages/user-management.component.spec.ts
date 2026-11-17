import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { UserManagementComponent } from './user-management.component';

describe('UserManagementComponent', () => {
	let component: UserManagementComponent;
	let fixture: ComponentFixture<UserManagementComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [UserManagementComponent],
			providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), MessageService],
		}).compileComponents();

		fixture = TestBed.createComponent(UserManagementComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
