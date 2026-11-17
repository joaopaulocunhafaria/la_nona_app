import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { environment } from '../../src/environments/environment.development';

/**
 * Roda uma vez antes dos testes: confere se o Supabase local está no ar, guarda a chave
 * `service_role` LOCAL (usada só pela fixture `banco` para criar usuários e limpar dados de teste,
 * nunca versionada nem usada pelo app) e aquece o Realtime.
 */
export default async function preparacaoGlobal(): Promise<void> {
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

	await aquecerRealtime(createClient(environment.supabaseUrl, chave, { auth: { persistSession: false, autoRefreshToken: false } }));
}

/**
 * Logo após `db:reset` o Realtime local demora para começar a entregar `postgres_changes` (o primeiro
 * canal pode nem assinar). Espera até um evento real das tabelas do chat chegar, para os testes de
 * tempo real não dependerem desse aquecimento.
 */
async function aquecerRealtime(admin: SupabaseClient): Promise<void> {
	const { data, error } = await admin.auth.admin.createUser({
		email: `aquecimento.${Date.now()}@lanona.test`,
		password: 'Aquecimento@123',
		email_confirm: true,
	});
	if (error) throw error;
	const usuarioId = data.user.id;
	const limite = Date.now() + 90_000;

	try {
		await admin.from('chat_threads').insert({ user_id: usuarioId });
		let contador = 0;
		while (Date.now() < limite) {
			const recebido = await new Promise<boolean>((resolver) => {
				const canal = admin.channel(`aquecimento-${Date.now()}`);
				const desistir = setTimeout(() => {
					admin.removeChannel(canal);
					resolver(false);
				}, 8_000);
				canal
					.on(
						'postgres_changes',
						{ event: 'UPDATE', schema: 'public', table: 'chat_threads', filter: `user_id=eq.${usuarioId}` },
						() => {
							clearTimeout(desistir);
							admin.removeChannel(canal);
							resolver(true);
						},
					)
					.subscribe(async (status) => {
						if (status === 'SUBSCRIBED') {
							await admin.from('chat_threads').update({ admin_unread_count: ++contador }).eq('user_id', usuarioId);
						}
					});
			});
			if (recebido) return;
		}
		throw new Error('O Realtime local não entregou eventos em 90 s. Confira `npm run db:status`.');
	} finally {
		await admin.auth.admin.deleteUser(usuarioId);
	}
}
