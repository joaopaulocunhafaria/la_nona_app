import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CartPageComponent } from './cart-page.component';

describe('CartPageComponent', () => {
	let component: CartPageComponent;
	let fixture: ComponentFixture<CartPageComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [CartPageComponent],
			providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), MessageService],
		}).compileComponents();

		fixture = TestBed.createComponent(CartPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
