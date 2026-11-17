import type { StatusItemCardapio } from '@lanona/shared';

export interface MenuItemImage {
	id: string;
	/** URL pública da imagem (bucket `cardapio` ou URL externa). */
	url: string;
	/** Caminho do objeto no bucket `cardapio` (null para URLs externas). */
	storagePath: string | null;
	position: number;
}

/** Situação de um item do cardápio (espelha o check de `menu_items.status`). */
export type MenuItemStatus = StatusItemCardapio;

/** Rótulo exibido ao usuário para cada status. */
export const STATUS_LABELS: Record<MenuItemStatus, string> = {
	DISPONIVEL: 'Disponível',
	FEITO_NA_HORA: 'Feito na hora',
	VERIFICAR_DISPONIBILIDADE: 'Verificar disponibilidade',
	INDISPONIVEL: 'Indisponível',
};

/** Severidade (cor) do p-tag para cada status. */
export const STATUS_SEVERITIES: Record<MenuItemStatus, 'success' | 'info' | 'warn' | 'danger'> = {
	DISPONIVEL: 'success',
	FEITO_NA_HORA: 'info',
	VERIFICAR_DISPONIBILIDADE: 'warn',
	INDISPONIVEL: 'danger',
};

/** Opções de status para selects (cadastro de itens). */
export const STATUS_OPTIONS: { label: string; value: MenuItemStatus }[] = (Object.keys(STATUS_LABELS) as MenuItemStatus[]).map(
	(value) => ({ label: STATUS_LABELS[value], value }),
);

/** Indica se o item pode ser adicionado ao carrinho no status informado. */
export function podePedir(status: MenuItemStatus): boolean {
	return status !== 'INDISPONIVEL';
}

export interface MenuItem {
	id: string;
	name: string;
	description: string;
	price: number;
	/** Nome da categoria (para exibição e filtro no cardápio). */
	category: string;
	/** Id da categoria vinculada (usado no formulário de edição). */
	categoryId: string;
	status: MenuItemStatus;
	images: MenuItemImage[];
	createdAt: string;
	updatedAt: string;
}

/**
 * Imagem do formulário de item. Para uma imagem nova, informe `arquivo` (o serviço comprime e
 * envia ao bucket). Para manter uma imagem já existente na edição, informe `url` (+ `storagePath`).
 */
export interface MenuItemImageRequest {
	url?: string;
	storagePath?: string | null;
	arquivo?: File;
}

export interface MenuItemRequest {
	name: string;
	description: string;
	price: number;
	/** Id da categoria selecionada. */
	category: string;
	status: MenuItemStatus;
	images: MenuItemImageRequest[];
}
