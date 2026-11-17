import { PostgrestError } from '@supabase/supabase-js';
import { from, map, Observable } from 'rxjs';

/**
 * Converte uma chamada do Supabase (Promise `{ data, error }`) em Observable,
 * emitindo `data` ou lançando `error`: mantém o padrão `subscribe({ next, error })`.
 */
export function deSupabase<T>(consulta: PromiseLike<{ data: T | null; error: PostgrestError | Error | null }>): Observable<T> {
	return from(consulta).pipe(
		map(({ data, error }) => {
			if (error) throw error;
			return data as T;
		}),
	);
}

type RespostaSupabase = { data: unknown; error: PostgrestError | Error | null };

/** Tipo de `data` no caso de sucesso (as respostas do PostgREST são uniões sucesso | falha). */
type DadosDe<R extends RespostaSupabase> = [Extract<R, { error: null }>] extends [never]
	? NonNullable<R['data']>
	: Extract<R, { error: null }>['data'];

/** Lança o `error` de uma resposta do Supabase e devolve `data` (para fluxos async/await). */
export function dadosOuErro<R extends RespostaSupabase>(resposta: R): DadosDe<R> {
	if (resposta.error) throw resposta.error;
	return resposta.data as DadosDe<R>;
}

/** Código do erro do Postgres/PostgREST (`23505` = valor duplicado, `23503` = registro em uso…). */
export function codigoErro(erro: unknown): string | null {
	return erro && typeof erro === 'object' && 'code' in erro && typeof erro.code === 'string' ? erro.code : null;
}

/**
 * Mensagem amigável a partir de um erro do Supabase. As RPCs já lançam mensagens em pt-BR,
 * que são repassadas como estão; erros de constraint viram textos genéricos.
 */
export function mensagemErro(erro: unknown, padrao = 'Não foi possível concluir a operação.'): string {
	const codigo = codigoErro(erro);
	if (codigo === '23505') return 'Já existe um cadastro com esses dados.';
	if (codigo === '23503') return 'Este registro está em uso e não pode ser removido.';
	if (codigo?.startsWith('23') || codigo === '42501' || codigo === 'PGRST301') return padrao;
	if (erro && typeof erro === 'object' && 'message' in erro && typeof erro.message === 'string' && erro.message.trim()) {
		return erro.message;
	}
	return padrao;
}

/** Escapa os curingas do LIKE/ILIKE (`%`, `_` e `\`) para buscar o termo literalmente. */
export function escaparLike(termo: string): string {
	return termo.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
}
