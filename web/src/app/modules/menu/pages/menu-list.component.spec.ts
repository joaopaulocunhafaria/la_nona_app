import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { MenuListComponent } from './menu-list.component';

describe('MenuListComponent', () => {
	let component: MenuListComponent;
	let fixture: ComponentFixture<MenuListComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [MenuListComponent],
			providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), ConfirmationService, MessageService],
		}).compileComponents();

		fixture = TestBed.createComponent(MenuListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
