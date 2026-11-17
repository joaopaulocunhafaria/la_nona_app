import { Provider } from '@angular/core';
import { SupabaseService } from '../app/services/supabase.service';

/**
 * Supabase falso para testes Karma: nenhuma chamada sai para a rede.
 * `dados` mapeia tabela -> linhas (`from('x')`) e `rpc:nome` -> retorno da RPC.
 * Toda consulta encadeada (`select`, `eq`, `order`…) resolve para `{ data, error: null }`.
 */
export function criarSupabaseFalso(dados: Record<string, unknown> = {}) {
	const resposta = (valor: unknown) => Promise.resolve({ data: valor, error: null, count: Array.isArray(valor) ? valor.length : null });

	const consulta = (tabela: string): unknown => {
		const linhas = dados[tabela] ?? [];
		const unica = Array.isArray(linhas) ? (linhas[0] ?? null) : linhas;
		const construtor: Record<string, unknown> = {};
		const encadear = () => construtor;
		for (const metodo of [
			'select',
			'insert',
			'update',
			'delete',
			'upsert',
			'eq',
			'neq',
			'in',
			'ilike',
			'order',
			'range',
			'limit',
			'filter',
			'match',
		]) {
			construtor[metodo] = encadear;
		}
		construtor['single'] = () => resposta(unica);
		construtor['maybeSingle'] = () => resposta(unica);
		construtor['then'] = (sucesso: (valor: unknown) => unknown, falha?: (erro: unknown) => unknown) =>
			resposta(linhas).then(sucesso, falha);
		return construtor;
	};

	const canal: Record<string, unknown> = {};
	canal['on'] = () => canal;
	canal['subscribe'] = () => canal;

	return {
		from: consulta,
		rpc: (nome: string) => resposta(dados[`rpc:${nome}`] ?? null),
		channel: () => canal,
		removeChannel: () => Promise.resolve('ok'),
		realtime: { setAuth: () => undefined },
		auth: {
			getSession: () => Promise.resolve({ data: { session: null }, error: null }),
			getUser: () => Promise.resolve({ data: { user: null }, error: null }),
			onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
			signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
			signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
			signInWithIdToken: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
			signOut: () => Promise.resolve({ error: null }),
		},
		storage: {
			from: () => ({
				upload: () => Promise.resolve({ data: { path: 'x' }, error: null }),
				remove: () => Promise.resolve({ data: [], error: null }),
				getPublicUrl: (caminho: string) => ({ data: { publicUrl: `http://storage.local/${caminho}` } }),
			}),
		},
	};
}

/** Provider do `SupabaseService` com o cliente falso. */
export function provideSupabaseFalso(dados: Record<string, unknown> = {}): Provider {
	return { provide: SupabaseService, useValue: { client: criarSupabaseFalso(dados) } };
}
