// Produção: Dashboard Supabase > Project Settings > API.
// A supabaseUrl é a URL BASE do projeto (sem /rest/v1).
// A publishable/anon key é pública por design; a segurança vem das policies de RLS.
// NUNCA coloque a service_role/secret key no front-end.
// O build da Vercel (`npm run build:vercel`) falha enquanto estes valores não forem os de produção.
export const environment = {
	production: true,
	supabaseUrl: 'https://PREENCHER.supabase.co',
	supabaseKey: 'sb_publishable_PREENCHER',
	googleClientId: '',
};
