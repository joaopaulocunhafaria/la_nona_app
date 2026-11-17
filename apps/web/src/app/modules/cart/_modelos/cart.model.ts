import { MenuItem } from '../../menu/_modelos/menu-item.model';

export interface CartItem {
	id: string;
	menuItem: MenuItem;
	quantity: number;
	addedAt: string;
	subtotal: number;
}

export interface Cart {
	items: CartItem[];
	total: number;
}
