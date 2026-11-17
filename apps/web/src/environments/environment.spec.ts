import { environment } from './environment';

// Nos testes Karma não há fileReplacements: este é o environment de PRODUÇÃO (o usado no deploy da Vercel).
describe('environment de produção', () => {
	it('está marcado como produção', () => {
		expect(environment.production).toBeTrue();
	});

	it('aponta para a URL base de um projeto Supabase (sem /rest/v1)', () => {
		expect(environment.supabaseUrl).toMatch(/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/);
	});

	it('usa a publishable key (nunca a secreta)', () => {
		expect(environment.supabaseKey).toMatch(/^sb_publishable_/);
		expect(environment.supabaseKey).not.toMatch(/^sb_secret_|service_role/);
	});
});
