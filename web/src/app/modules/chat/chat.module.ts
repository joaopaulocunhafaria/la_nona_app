import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { SharedModule } from '../../utils/shared.module';
import { AdminChatListComponent } from './pages/admin-chat-list.component';
import { SupportChatComponent } from './pages/support-chat.component';
import { ChatRoutingModule } from './chat-routing.module';

@NgModule({
	declarations: [SupportChatComponent, AdminChatListComponent],
	imports: [CommonModule, ChatRoutingModule, SharedModule, FormsModule, AvatarModule, BadgeModule, ButtonModule, ProgressSpinnerModule],
})
export class ChatModule {}
