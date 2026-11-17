/**
 * Reduz e recomprime uma imagem no navegador antes do upload (lado maior até `ladoMaximo`,
 * JPEG com qualidade 0,8). GIFs e arquivos que não decodificam voltam como estão.
 */
export async function comprimirImagem(arquivo: File, ladoMaximo = 1600, qualidade = 0.8): Promise<Blob> {
	if (arquivo.type === 'image/gif' || typeof document === 'undefined') {
		return arquivo;
	}

	try {
		const bitmap = await createImageBitmap(arquivo);
		const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(bitmap.width * escala);
		canvas.height = Math.round(bitmap.height * escala);
		const contexto = canvas.getContext('2d');
		if (!contexto) {
			return arquivo;
		}
		contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		bitmap.close();

		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualidade));
		return blob && blob.size < arquivo.size ? blob : arquivo;
	} catch {
		return arquivo;
	}
}

/** Extensão do arquivo a partir do tipo MIME (para nomear o objeto no bucket). */
export function extensaoDaImagem(tipo: string): string {
	const extensoes: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
	return extensoes[tipo] ?? 'jpg';
}
