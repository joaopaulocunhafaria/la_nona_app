import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { FavoritesPageComponent } from './favorites-page.component';

describe('FavoritesPageComponent', () => {
	let component: FavoritesPageComponent;
	let fixture: ComponentFixture<FavoritesPageComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [FavoritesPageComponent],
			providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), MessageService],
		}).compileComponents();

		fixture = TestBed.createComponent(FavoritesPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
