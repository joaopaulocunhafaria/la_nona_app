import { CurrencyPipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'brl', standalone: false })
export class BrlPipe implements PipeTransform {
	private readonly currencyPipe = new CurrencyPipe('pt-BR', 'BRL');

	transform(value: number | string | null | undefined): string {
		if (value === null || value === undefined || value === '') {
			return this.currencyPipe.transform(0, 'BRL', 'symbol', '1.2-2') ?? '';
		}
		const numero = typeof value === 'string' ? Number(value) : value;
		return this.currencyPipe.transform(numero, 'BRL', 'symbol', '1.2-2') ?? '';
	}
}
