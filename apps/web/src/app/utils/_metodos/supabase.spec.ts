import { firstValueFrom } from 'rxjs';
import { codigoErro, dadosOuErro, deSupabase, escaparLike, mensagemErro } from './supabase';

describe('utilitários do Supabase', () => {
	it('deSupabase emite data no sucesso', async () => {
		await expectAsync(firstValueFrom(deSupabase(Promise.resolve({ data: [1, 2], error: null })))).toBeResolvedTo([1, 2]);
	});

	it('deSupabase lança o error', async () => {
		const erro = new Error('falhou');
		await expectAsync(firstValueFrom(deSupabase(Promise.resolve({ data: null, error: erro })))).toBeRejectedWith(erro);
	});

	it('dadosOuErro devolve data ou lança', () => {
		expect(dadosOuErro({ data: 'ok', error: null })).toBe('ok');
		expect(() => dadosOuErro({ data: null, error: new Error('x') })).toThrowError('x');
	});

	it('codigoErro lê o code do Postgres', () => {
		expect(codigoErro({ code: '23505' })).toBe('23505');
		expect(codigoErro(new Error('sem código'))).toBeNull();
		expect(codigoErro(null)).toBeNull();
	});

	it('mensagemErro traduz duplicidade e FK, e repassa a mensagem das RPCs', () => {
		expect(mensagemErro({ code: '23505', message: 'duplicate key' })).toBe('Já existe um cadastro com esses dados.');
		expect(mensagemErro({ code: '23503', message: 'fk' })).toBe('Este registro está em uso e não pode ser removido.');
		expect(mensagemErro({ code: '23514', message: 'check' }, 'padrão')).toBe('padrão');
		expect(mensagemErro({ code: '42501', message: 'permission denied' }, 'padrão')).toBe('padrão');
		expect(mensagemErro({ code: '22023', message: 'CEP obrigatório.' })).toBe('CEP obrigatório.');
		expect(mensagemErro(undefined, 'padrão')).toBe('padrão');
	});

	it('escaparLike escapa curingas', () => {
		expect(escaparLike('50%_off\\')).toBe('50\\%\\_off\\\\');
		expect(escaparLike('pizza')).toBe('pizza');
	});
});
