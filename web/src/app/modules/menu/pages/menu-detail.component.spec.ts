import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { MenuDetailComponent } from './menu-detail.component';

describe('MenuDetailComponent', () => {
	let component: MenuDetailComponent;
	let fixture: ComponentFixture<MenuDetailComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [MenuDetailComponent],
			providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), MessageService],
		}).compileComponents();

		fixture = TestBed.createComponent(MenuDetailComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
