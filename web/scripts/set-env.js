// Gera src/environments/environment.ts (perfil de producao) a partir de variaveis
// de ambiente no momento do build. Roda automaticamente antes de `npm run build`
// (hook `prebuild`), incluindo o build da Vercel.
//
// Variaveis lidas:
//   API_BASE_URL     -> origem publica do backend, ex.:
//                       https://la-nona-app-pratical-agent-development.onrender.com
//                       Dela derivamos apiUrl (${base}/api) e wsUrl (${base}/ws).
//   GOOGLE_CLIENT_ID -> client id do login com Google (opcional).
//
// Sem API_BASE_URL definida (build local), mantem os caminhos relativos /api e /ws
// resolvidos pelo proxy.conf.json contra o backend em localhost:8080 — ou seja,
// nao atrapalha o desenvolvimento local.
const fs = require('fs');
const path = require('path');

const baseUrl = (process.env.API_BASE_URL || '').trim().replace(/\/+$/, '');
const apiUrl = baseUrl ? `${baseUrl}/api` : '/api';
const wsUrl = baseUrl ? `${baseUrl}/ws` : '/ws';
const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();

const contents = `// ARQUIVO GERADO por scripts/set-env.js no build (hook prebuild).
// Nao edite manualmente: em producao os valores vem de variaveis de ambiente
// (API_BASE_URL, GOOGLE_CLIENT_ID). Sem elas, cai nos caminhos relativos usados
// no desenvolvimento local (proxy.conf.json -> localhost:8080).
export const environment = {
	production: true,
	apiUrl: '${apiUrl}',
	wsUrl: '${wsUrl}',
	googleClientId: '${googleClientId}',
};
`;

const target = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');
fs.writeFileSync(target, contents);
console.log(`[set-env] environment.ts gerado -> apiUrl='${apiUrl}', wsUrl='${wsUrl}', googleClientId='${googleClientId ? '(definido)' : '(vazio)'}'`);
