import { Injectable } from '@angular/core';
import { from, map, Observable } from 'rxjs';
import { SupabaseService } from '../../../services/supabase.service';
import { comprimirImagem, extensaoDaImagem } from '../../../utils/_metodos/imagem';
import { dadosOuErro, deSupabase, escaparLike } from '../../../utils/_metodos/supabase';
import { MenuItem, MenuItemImageRequest, MenuItemRequest, MenuItemStatus } from '../_modelos/menu-item.model';

const BUCKET_CARDAPIO = 'cardapio';

/** Colunas do item com a categoria e as imagens embutidas (PostgREST). */
export const SELECT_ITEM_CARDAPIO =
	'id, name, description, price, status, category_id, created_at, updated_at, menu_categories(name), menu_item_images(id, url, storage_path, position)';

interface LinhaItemCardapio {
	id: string;
	name: string;
	description: string;
	price: number;
	status: string;
	category_id: string;
	created_at: string;
	updated_at: string;
	menu_categories: { name: string } | null;
	menu_item_images: { id: string; url: string; storage_path: string | null; position: number }[];
}

/** Converte a linha do PostgREST no modelo das telas. */
export function itemDaLinha(linha: LinhaItemCardapio): MenuItem {
	return {
		id: linha.id,
		name: linha.name,
		description: linha.description,
		price: Number(linha.price),
		category: linha.menu_categories?.name ?? '',
		categoryId: linha.category_id,
		status: linha.status as MenuItemStatus,
		images: [...(linha.menu_item_images ?? [])]
			.sort((a, b) => a.position - b.position)
			.map((imagem) => ({ id: imagem.id, url: imagem.url, storagePath: imagem.storage_path, position: imagem.position })),
		createdAt: linha.created_at,
		updatedAt: linha.updated_at,
	};
}

@Injectable({ providedIn: 'root' })
export class MenuItemService {
	constructor(private readonly supabaseService: SupabaseService) {}

	listar(filtros?: { category?: string; status?: MenuItemStatus; q?: string }): Observable<MenuItem[]> {
		const selecao = filtros?.category ? SELECT_ITEM_CARDAPIO.replace('menu_categories(name)', 'menu_categories!inner(name)') : SELECT_ITEM_CARDAPIO;
		let consulta = this.supabaseService.client.from('menu_items').select(selecao);

		if (filtros?.category) {
			consulta = consulta.eq('menu_categories.name', filtros.category);
		}
		if (filtros?.status !== undefined) {
			consulta = consulta.eq('status', filtros.status);
		}
		if (filtros?.q?.trim()) {
			consulta = consulta.ilike('name', `%${escaparLike(filtros.q.trim())}%`);
		}

		return deSupabase(consulta.order('name')).pipe(map((linhas) => (linhas as unknown as LinhaItemCardapio[]).map(itemDaLinha)));
	}

	/** Nomes das categorias que têm ao menos um item (chips de filtro do cardápio). */
	listarCategorias(): Observable<string[]> {
		return deSupabase(this.supabaseService.client.from('menu_categories').select('name, menu_items!inner(id)').order('name')).pipe(
			map((linhas) => linhas.map((linha) => linha.name)),
		);
	}

	buscarPorId(id: string): Observable<MenuItem> {
		return deSupabase(this.supabaseService.client.from('menu_items').select(SELECT_ITEM_CARDAPIO).eq('id', id).single()).pipe(
			map((linha) => itemDaLinha(linha as unknown as LinhaItemCardapio)),
		);
	}

	criar(request: MenuItemRequest): Observable<MenuItem> {
		return from(this.salvar(null, request));
	}

	atualizar(id: string, request: MenuItemRequest): Observable<MenuItem> {
		return from(this.salvar(id, request));
	}

	excluir(id: string): Observable<void> {
		return from(
			(async () => {
				const imagens = dadosOuErro(
					await this.supabaseService.client.from('menu_item_images').select('storage_path').eq('menu_item_id', id),
				);
				const removido = dadosOuErro(await this.supabaseService.client.from('menu_items').delete().eq('id', id).select('id').maybeSingle());
				if (!removido) {
					throw new Error('Item de cardápio não encontrado.');
				}
				this.removerObjetos(imagens.map((imagem) => imagem.storage_path));
			})(),
		);
	}

	/**
	 * Envia as imagens novas ao bucket, grava item + imagens numa transação (RPC) e remove do
	 * bucket as imagens que deixaram de fazer parte do item. Se a gravação falhar, apaga os uploads.
	 */
	private async salvar(id: string | null, request: MenuItemRequest): Promise<MenuItem> {
		const anteriores = id
			? dadosOuErro(await this.supabaseService.client.from('menu_item_images').select('storage_path').eq('menu_item_id', id))
			: [];

		const enviados: string[] = [];
		try {
			const imagens: { url: string; storage_path: string | null }[] = [];
			for (const imagem of request.images) {
				imagens.push(await this.resolverImagem(imagem, enviados));
			}

			const itemId = dadosOuErro(
				await this.supabaseService.client.rpc('salvar_item_cardapio', {
					// null = novo item (o tipo gerado não marca o parâmetro como opcional).
					p_id: id as string,
					p_dados: {
						name: request.name,
						description: request.description,
						price: request.price,
						category_id: request.category,
						status: request.status,
					},
					p_imagens: imagens,
				}),
			);

			const mantidos = new Set(imagens.map((imagem) => imagem.storage_path));
			this.removerObjetos(anteriores.map((imagem) => imagem.storage_path).filter((caminho) => !mantidos.has(caminho)));

			const linha = dadosOuErro(
				await this.supabaseService.client.from('menu_items').select(SELECT_ITEM_CARDAPIO).eq('id', itemId).single(),
			);
			return itemDaLinha(linha as unknown as LinhaItemCardapio);
		} catch (erro) {
			this.removerObjetos(enviados);
			throw erro;
		}
	}

	private async resolverImagem(imagem: MenuItemImageRequest, enviados: string[]): Promise<{ url: string; storage_path: string | null }> {
		if (!imagem.arquivo) {
			return { url: imagem.url ?? '', storage_path: imagem.storagePath ?? null };
		}

		const storage = this.supabaseService.client.storage.from(BUCKET_CARDAPIO);
		const conteudo = await comprimirImagem(imagem.arquivo);
		const tipo = conteudo.type || imagem.arquivo.type;
		const caminho = `itens/${crypto.randomUUID()}.${extensaoDaImagem(tipo)}`;

		const envio = await storage.upload(caminho, conteudo, { contentType: tipo, cacheControl: '31536000', upsert: false });
		if (envio.error) {
			throw new Error('Não foi possível salvar a imagem. Tente novamente.');
		}
		enviados.push(caminho);
		return { url: storage.getPublicUrl(caminho).data.publicUrl, storage_path: caminho };
	}

	/** Remoção best-effort de objetos do bucket (falha não quebra o fluxo principal). */
	private removerObjetos(caminhos: (string | null)[]): void {
		const validos = caminhos.filter((caminho): caminho is string => !!caminho);
		if (validos.length === 0) {
			return;
		}
		this.supabaseService.client.storage
			.from(BUCKET_CARDAPIO)
			.remove(validos)
			.then(
				() => undefined,
				() => undefined,
			);
	}
}
