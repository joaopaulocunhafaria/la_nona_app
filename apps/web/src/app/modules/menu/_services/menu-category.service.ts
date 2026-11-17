import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { SupabaseService } from '../../../services/supabase.service';
import { codigoErro, deSupabase } from '../../../utils/_metodos/supabase';
import { MenuCategory, MenuCategoryRequest } from '../_modelos/menu-category.model';

interface LinhaCategoria {
	id: string;
	name: string;
	created_at: string;
	updated_at: string;
	menu_items: { count: number }[];
}

function categoriaDaLinha(linha: LinhaCategoria): MenuCategory {
	return {
		id: linha.id,
		name: linha.name,
		itemCount: linha.menu_items?.[0]?.count ?? 0,
		createdAt: linha.created_at,
		updatedAt: linha.updated_at,
	};
}

const SELECT_CATEGORIA = 'id, name, created_at, updated_at, menu_items(count)';

@Injectable({ providedIn: 'root' })
export class MenuCategoryService {
	constructor(private readonly supabaseService: SupabaseService) {}

	listar(): Observable<MenuCategory[]> {
		return deSupabase(this.supabaseService.client.from('menu_categories').select(SELECT_CATEGORIA).order('name')).pipe(
			map((linhas) => (linhas as unknown as LinhaCategoria[]).map(categoriaDaLinha)),
		);
	}

	criar(request: MenuCategoryRequest): Observable<MenuCategory> {
		const nome = request.name.trim();
		if (!nome) {
			return throwError(() => new Error('Nome da categoria é obrigatório'));
		}
		if (nome.length > 60) {
			return throwError(() => new Error('Nome da categoria deve ter no máximo 60 caracteres'));
		}

		return deSupabase(this.supabaseService.client.from('menu_categories').insert({ name: nome }).select(SELECT_CATEGORIA).single()).pipe(
			map((linha) => categoriaDaLinha(linha as unknown as LinhaCategoria)),
			catchError((erro) =>
				throwError(() => (codigoErro(erro) === '23505' ? new Error('Já existe uma categoria com esse nome.') : erro)),
			),
		);
	}

	excluir(id: string): Observable<void> {
		return deSupabase(this.supabaseService.client.from('menu_categories').delete().eq('id', id).select('id').maybeSingle()).pipe(
			map((removida) => {
				if (!removida) {
					throw new Error('Categoria não encontrada.');
				}
			}),
			catchError((erro) =>
				throwError(() =>
					codigoErro(erro) === '23503'
						? new Error('Não é possível excluir uma categoria com itens vinculados. Remova ou altere os itens primeiro.')
						: erro,
				),
			),
		);
	}
}
