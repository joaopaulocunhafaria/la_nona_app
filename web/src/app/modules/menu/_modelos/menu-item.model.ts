export interface MenuItemImage {
	id: string;
	data: string;
	position: number;
}

export interface MenuItem {
	id: string;
	name: string;
	description: string;
	price: number;
	category: string;
	available: boolean;
	images: MenuItemImage[];
	createdAt: string;
	updatedAt: string;
}

export interface MenuItemImageRequest {
	base64: string;
	contentType: string;
}

export interface MenuItemRequest {
	name: string;
	description: string;
	price: number;
	category: string;
	available: boolean;
	images: MenuItemImageRequest[];
}
