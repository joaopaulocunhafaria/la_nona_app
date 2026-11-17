import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { SupportChatComponent } from './support-chat.component';
import { provideSupabaseFalso } from '../../../../testing/supabase-falso';

describe('SupportChatComponent', () => {
	let component: SupportChatComponent;
	let fixture: ComponentFixture<SupportChatComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			schemas: [NO_ERRORS_SCHEMA],
			declarations: [SupportChatComponent],
			providers: [provideSupabaseFalso(), provideRouter([]), MessageService],
		}).compileComponents();

		fixture = TestBed.createComponent(SupportChatComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
