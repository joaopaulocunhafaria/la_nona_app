// Produção: Dashboard Supabase > Project Settings > API.
// A supabaseUrl é a URL BASE do projeto (sem /rest/v1).
// A publishable/anon key é pública por design; a segurança vem das policies de RLS.
// NUNCA coloque a service_role/secret key no front-end.
export const environment = {
	production: true,
	supabaseUrl: 'https://ftkzsqpsppyiakchoinb.supabase.co',
	supabaseKey: 'sb_publishable_FdD-zq0kpFIDEx4ay8IVTg_0F2odwLA',
	googleClientId: '',
};
