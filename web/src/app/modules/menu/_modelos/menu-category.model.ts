export interface MenuCategory {
	id: string;
	name: string;
	/** Quantidade de itens de cardápio vinculados a esta categoria. */
	itemCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface MenuCategoryRequest {
	name: string;
}
