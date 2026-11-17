import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * Roda uma vez antes dos testes: confere se o Supabase local está no ar e guarda a chave
 * `service_role` LOCAL (usada só pela fixture `banco` para criar usuários e limpar dados de teste).
 * Ela nunca é versionada nem usada pelo app.
 */
export default function preparacaoGlobal(): void {
	let saida: string;
	try {
		saida = execSync('npx supabase status -o env', {
			cwd: resolve(__dirname, '../../../..'),
			stdio: ['ignore', 'pipe', 'ignore'],
		}).toString();
	} catch {
		throw new Error('Supabase local fora do ar. Rode `npm run db:start` (e `npm run db:reset` se o schema mudou) antes dos testes E2E.');
	}
	const chave = /^SERVICE_ROLE_KEY="?([^"\n]+)"?$/m.exec(saida)?.[1];
	if (!chave) throw new Error('Não foi possível ler a SERVICE_ROLE_KEY de `supabase status`.');
	process.env['E2E_SERVICE_ROLE_KEY'] = chave;
}
