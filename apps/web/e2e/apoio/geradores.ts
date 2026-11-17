/** Geradores de dados únicos: cada teste cria os próprios registros e não depende do seed. */

let contador = 0;

/** Sufixo curto e único por execução (evita colisão entre testes paralelos). */
export function unico(): string {
	contador++;
	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${contador}`.toUpperCase();
}

/** E-mail único (minúsculo, como o app grava). */
export function emailUnico(prefixo = 'e2e'): string {
	return `${prefixo}.${unico()}@lanona.test`.toLowerCase();
}

/** Senha válida para os testes (mínimo de 8 caracteres). */
export const SENHA_PADRAO = 'Senha@E2E123';

/** PNG 1x1 válido, usado nos uploads de imagem. */
export const PNG_1X1 = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
	'base64',
);
