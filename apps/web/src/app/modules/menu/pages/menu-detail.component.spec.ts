import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { MenuDetailComponent } from './menu-detail.component';
import { provideSupabaseFalso } from '../../../../testing/supabase-falso';

describe('MenuDetailComponent', () => {
	let component: MenuDetailComponent;
	let fixture: ComponentFixture<MenuDetailComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			schemas: [NO_ERRORS_SCHEMA],
			declarations: [MenuDetailComponent],
			providers: [provideSupabaseFalso(), provideRouter([]), MessageService],
		}).compileComponents();

		fixture = TestBed.createComponent(MenuDetailComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
