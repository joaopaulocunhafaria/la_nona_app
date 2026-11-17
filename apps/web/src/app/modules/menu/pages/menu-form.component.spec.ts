import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { MenuFormComponent } from './menu-form.component';

describe('MenuFormComponent', () => {
	let component: MenuFormComponent;
	let fixture: ComponentFixture<MenuFormComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [MenuFormComponent],
			providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), MessageService],
		}).compileComponents();

		fixture = TestBed.createComponent(MenuFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
