import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdmGuard } from '../../guards/adm.guard';
import { AdminChatListComponent } from './pages/admin-chat-list.component';
import { SupportChatComponent } from './pages/support-chat.component';

const routes: Routes = [
	{ path: '', component: SupportChatComponent },
	{ path: 'admin', component: AdminChatListComponent, canActivate: [AdmGuard] },
	{ path: 'admin/:userId', component: SupportChatComponent, canActivate: [AdmGuard] },
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class ChatRoutingModule {}
