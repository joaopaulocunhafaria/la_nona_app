import { Injectable } from '@angular/core';
import { from, map, Observable, tap } from 'rxjs';
import { comprimirImagem, extensaoDaImagem } from '../utils/_metodos/imagem';
import { dadosOuErro, deSupabase } from '../utils/_metodos/supabase';
import { AddressRequest, UsuarioResponse, usuarioDoPerfil } from './auth.models';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

const BUCKET_FOTOS = 'fotos-perfil';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly authService: AuthService,
	) {}

	getMe(): Observable<UsuarioResponse> {
		return this.authService.recarregarPerfil();
	}

	atualizarEndereco(request: AddressRequest): Observable<UsuarioResponse> {
		return deSupabase(
			this.supabaseService.client.rpc('salvar_endereco', {
				p_cep: request.cep ?? '',
				p_rua: request.rua ?? '',
				p_bairro: request.bairro ?? '',
				p_numero: request.numero ?? '',
				p_cidade: request.cidade ?? '',
				p_estado: request.estado ?? '',
				p_complemento: request.complemento ?? '',
			}),
		).pipe(
			map((perfil) => usuarioDoPerfil(perfil)),
			tap((usuario) => this.authService.atualizarUsuario(usuario)),
		);
	}

	/** Envia a foto para `fotos-perfil/<uid>/`, grava a URL no perfil e remove a foto anterior. */
	atualizarFoto(arquivo: File): Observable<UsuarioResponse> {
		return from(this.enviarFoto(arquivo)).pipe(tap((usuario) => this.authService.atualizarUsuario(usuario)));
	}

	private async enviarFoto(arquivo: File): Promise<UsuarioResponse> {
		const usuarioAtual = this.authService.usuario();
		if (!usuarioAtual) {
			throw new Error('Faça login para continuar.');
		}

		const storage = this.supabaseService.client.storage.from(BUCKET_FOTOS);
		const conteudo = await comprimirImagem(arquivo, 800);
		const caminho = `${usuarioAtual.id}/${Date.now()}.${extensaoDaImagem(conteudo.type || arquivo.type)}`;

		const envio = await storage.upload(caminho, conteudo, {
			contentType: conteudo.type || arquivo.type,
			cacheControl: '31536000',
			upsert: false,
		});
		if (envio.error) {
			throw new Error('Não foi possível salvar a imagem. Tente novamente.');
		}

		const url = storage.getPublicUrl(caminho).data.publicUrl;
		const perfil = dadosOuErro(await this.supabaseService.client.rpc('atualizar_foto', { p_url: url }));

		const caminhoAnterior = this.caminhoNoBucket(usuarioAtual.photo);
		if (caminhoAnterior && caminhoAnterior !== caminho) {
			storage.remove([caminhoAnterior]).then(
				() => undefined,
				() => undefined,
			);
		}

		return usuarioDoPerfil(perfil);
	}

	/** Caminho do objeto no bucket de fotos (null para fotos externas, ex.: Google). */
	private caminhoNoBucket(url: string | null): string | null {
		const marcador = `/storage/v1/object/public/${BUCKET_FOTOS}/`;
		const indice = url?.indexOf(marcador) ?? -1;
		return url && indice >= 0 ? decodeURIComponent(url.slice(indice + marcador.length)) : null;
	}
}
