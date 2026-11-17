import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AdminChatListComponent } from './admin-chat-list.component';
import { provideSupabaseFalso } from '../../../../testing/supabase-falso';

describe('AdminChatListComponent', () => {
	let component: AdminChatListComponent;
	let fixture: ComponentFixture<AdminChatListComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			schemas: [NO_ERRORS_SCHEMA],
			declarations: [AdminChatListComponent],
			providers: [provideSupabaseFalso(), provideRouter([]), MessageService],
		}).compileComponents();

		fixture = TestBed.createComponent(AdminChatListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
