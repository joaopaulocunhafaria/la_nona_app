// Garante que o build de produção (Vercel) aponta para o Supabase de PRODUÇÃO.
// Roda antes do `ng build` em `npm run build:vercel`; falha o deploy se o environment.ts estiver errado.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_REF_PRODUCAO = 'ftkzsqpsppyiakchoinb';
const URL_PRODUCAO = `https://${PROJECT_REF_PRODUCAO}.supabase.co`;

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arquivo = resolve(raiz, 'apps/web/src/environments/environment.ts');
const conteudo = readFileSync(arquivo, 'utf8');

const valor = (campo) => conteudo.match(new RegExp(`${campo}\\s*:\\s*['"\`]?([^'"\`,\\n]+)['"\`]?`))?.[1]?.trim();

const erros = [];
const production = valor('production');
const supabaseUrl = valor('supabaseUrl');
const supabaseKey = valor('supabaseKey');

if (PROJECT_REF_PRODUCAO === 'PREENCHER')
	erros.push('project ref de produção ainda não configurado em scripts/verificar-ambiente-producao.mjs');
if (production !== 'true') erros.push(`production deve ser true (encontrado: ${production})`);
if (supabaseUrl !== URL_PRODUCAO) erros.push(`supabaseUrl deve ser exatamente '${URL_PRODUCAO}' (encontrado: '${supabaseUrl}')`);
if (!supabaseKey) erros.push('supabaseKey ausente');
else if (supabaseKey.startsWith('sb_secret_') || /service_role/.test(supabaseKey))
	erros.push('supabaseKey é uma chave SECRETA: use a publishable/anon key');
else if (!supabaseKey.startsWith('sb_publishable_') || /PREENCHER/.test(supabaseKey))
	erros.push('supabaseKey deve ser a publishable key de produção (sb_publishable_...)');

if (erros.length) {
	console.error(`\n✖ Ambiente de produção inválido em ${arquivo}:\n  - ${erros.join('\n  - ')}\n`);
	process.exit(1);
}
console.log(`✔ Ambiente de produção ok: ${supabaseUrl}`);
