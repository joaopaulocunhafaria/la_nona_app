import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { PageHeaderComponent } from '../components/page-header.component';
import { BrlPipe } from './_pipes/brl.pipe';
import { TruncatePipe } from './_pipes/truncate.pipe';

@NgModule({
	declarations: [BrlPipe, TruncatePipe, PageHeaderComponent],
	imports: [CommonModule],
	exports: [BrlPipe, TruncatePipe, PageHeaderComponent],
})
export class SharedModule {}
