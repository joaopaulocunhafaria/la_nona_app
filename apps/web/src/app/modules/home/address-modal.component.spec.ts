import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AddressModalComponent } from './address-modal.component';

describe('AddressModalComponent', () => {
	let component: AddressModalComponent;
	let fixture: ComponentFixture<AddressModalComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [AddressModalComponent],
			providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), MessageService],
		}).compileComponents();

		fixture = TestBed.createComponent(AddressModalComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
