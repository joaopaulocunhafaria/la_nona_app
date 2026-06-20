import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class NotificacoesService {
	constructor(private readonly messageService: MessageService) {}

	sucesso(detail: string, summary = 'Sucesso'): void {
		this.messageService.add({ severity: 'success', summary, detail, life: 4000 });
	}

	erro(detail: string, summary = 'Erro'): void {
		this.messageService.add({ severity: 'error', summary, detail, life: 7000 });
	}

	info(detail: string, summary = 'Aviso'): void {
		this.messageService.add({ severity: 'info', summary, detail, life: 4000 });
	}
}
