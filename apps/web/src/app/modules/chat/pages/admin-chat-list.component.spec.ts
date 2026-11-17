import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AdminChatListComponent } from './admin-chat-list.component';

describe('AdminChatListComponent', () => {
	let component: AdminChatListComponent;
	let fixture: ComponentFixture<AdminChatListComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [AdminChatListComponent],
			providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), MessageService],
		}).compileComponents();

		fixture = TestBed.createComponent(AdminChatListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
