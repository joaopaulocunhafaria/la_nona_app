import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'truncate', standalone: false })
export class TruncatePipe implements PipeTransform {
	transform(value: string | null | undefined, limite = 60): string {
		if (!value) {
			return '';
		}
		return value.length > limite ? `${value.slice(0, limite).trimEnd()}…` : value;
	}
}
