// Desenvolvimento: Supabase local (`npm run db:start`). Confira URL e chaves com `npm run db:status`.
// A chave abaixo é a anon key demo padrão do Supabase CLI local (pública, só vale localmente).
// Para testar no celular pela rede local, troque 127.0.0.1 pelo IP da máquina (ex.: 192.168.0.10).
export const environment = {
	production: false,
	supabaseUrl: 'http://127.0.0.1:55321',
	supabaseKey:
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
	// Client ID OAuth (Web) do Google. Vazio = botão "Continuar com Google" escondido.
	googleClientId: '',
};
