import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { UsuarioResponse, usuarioDoPerfil } from '../../../../services/auth.models';
import { SupabaseService } from '../../../../services/supabase.service';
import { deSupabase } from '../../../../utils/_metodos/supabase';

@Injectable({ providedIn: 'root' })
export class AdminUserService {
	constructor(private readonly supabaseService: SupabaseService) {}

	listar(search?: string): Observable<UsuarioResponse[]> {
		return deSupabase(this.supabaseService.client.rpc('admin_buscar_usuarios', { p_busca: search?.trim() || undefined })).pipe(
			map((perfis) => perfis.map(usuarioDoPerfil)),
		);
	}

	atualizarRole(id: string, role: string): Observable<UsuarioResponse> {
		return deSupabase(this.supabaseService.client.rpc('admin_alterar_cargo', { p_id: id, p_role: role })).pipe(map(usuarioDoPerfil));
	}
}
