import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { FavoritesPageComponent } from './favorites-page.component';
import { provideSupabaseFalso } from '../../../../testing/supabase-falso';

describe('FavoritesPageComponent', () => {
	let component: FavoritesPageComponent;
	let fixture: ComponentFixture<FavoritesPageComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			schemas: [NO_ERRORS_SCHEMA],
			declarations: [FavoritesPageComponent],
			providers: [provideSupabaseFalso(), provideRouter([]), MessageService],
		}).compileComponents();

		fixture = TestBed.createComponent(FavoritesPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
