import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { SupportChatComponent } from './support-chat.component';

describe('SupportChatComponent', () => {
	let component: SupportChatComponent;
	let fixture: ComponentFixture<SupportChatComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [SupportChatComponent],
			providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), MessageService],
		}).compileComponents();

		fixture = TestBed.createComponent(SupportChatComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
