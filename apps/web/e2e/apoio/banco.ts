import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { CategoriaCardapio, Database, ItemCardapio, Perfil, StatusItemCardapio } from '@lanona/shared';
import { environment } from '../../src/environments/environment.development';
import { emailUnico, SENHA_PADRAO, unico } from './geradores';

export interface UsuarioCriado {
	id: string;
	email: string;
	senha: string;
	nome: string;
}

export interface OpcoesUsuario {
	nome?: string;
	admin?: boolean;
	/** Com endereço preenchido (padrão), a home não abre o modal obrigatório de endereço. */
	comEndereco?: boolean;
}

export interface OpcoesItem {
	nome?: string;
	descricao?: string;
	preco?: number;
	status?: StatusItemCardapio;
	categoriaId?: string;
}

const ENDERECO_PADRAO = {
	address_cep: '01001-000',
	address_rua: 'Praça da Sé',
	address_bairro: 'Sé',
	address_numero: '100',
	address_cidade: 'São Paulo',
	address_estado: 'SP',
	address_complemento: '',
	onboarding_completed: true,
};

/**
 * Acesso direto ao Supabase local para preparar cenários e conferir o que a tela gravou.
 * Usa a service_role LOCAL (lida de `supabase status` no globalSetup), que ignora o RLS:
 * só os testes a usam, nunca o app. Tudo que é criado (ou registrado) é removido em `limpar()`.
 */
export class Banco {
	public readonly admin: SupabaseClient<Database> = createClient<Database>(
		environment.supabaseUrl,
		process.env['E2E_SERVICE_ROLE_KEY'] ?? environment.supabaseKey,
		{ auth: { persistSession: false, autoRefreshToken: false } },
	);

	private readonly ids = {
		usuarios: new Set<string>(),
		itens: new Set<string>(),
		categorias: new Set<string>(),
		objetosCardapio: new Set<string>(),
	};

	/** Registra para limpeza registros criados pela própria tela. */
	public registrar(tipo: keyof Banco['ids'], id: string): void {
		this.ids[tipo].add(id);
	}

	public async criarUsuario(opcoes: OpcoesUsuario = {}): Promise<UsuarioCriado> {
		const email = emailUnico(opcoes.admin ? 'admin' : 'cliente');
		const nome = opcoes.nome ?? `${opcoes.admin ? 'Admin' : 'Cliente'} E2E ${unico()}`;
		const { data, error } = await this.admin.auth.admin.createUser({
			email,
			password: SENHA_PADRAO,
			email_confirm: true,
			user_metadata: { name: nome },
		});
		if (error) throw error;
		const id = data.user.id;
		this.registrar('usuarios', id);

		const alteracoes = {
			...(opcoes.comEndereco === false ? {} : ENDERECO_PADRAO),
			...(opcoes.admin ? { role: 'admin' } : {}),
		};
		if (Object.keys(alteracoes).length > 0) {
			const atualizacao = await this.admin.from('profiles').update(alteracoes).eq('id', id);
			if (atualizacao.error) throw atualizacao.error;
		}

		return { id, email, senha: SENHA_PADRAO, nome };
	}

	public async perfil(id: string): Promise<Perfil> {
		const { data, error } = await this.admin.from('profiles').select('*').eq('id', id).single();
		if (error) throw error;
		return data;
	}

	public async perfilPorEmail(email: string): Promise<Perfil | null> {
		const { data, error } = await this.admin.from('profiles').select('*').eq('email', email.toLowerCase()).maybeSingle();
		if (error) throw error;
		if (data) this.registrar('usuarios', data.id);
		return data;
	}

	public async criarCategoria(nome = `Categoria E2E ${unico()}`): Promise<CategoriaCardapio> {
		const { data, error } = await this.admin.from('menu_categories').insert({ name: nome }).select().single();
		if (error) throw error;
		this.registrar('categorias', data.id);
		return data;
	}

	public async categoriaPorNome(nome: string): Promise<CategoriaCardapio | null> {
		const { data, error } = await this.admin.from('menu_categories').select('*').eq('name', nome).maybeSingle();
		if (error) throw error;
		if (data) this.registrar('categorias', data.id);
		return data;
	}

	/** Cria um item com uma imagem externa (sem upload). Cria a categoria se não for informada. */
	public async criarItem(opcoes: OpcoesItem = {}): Promise<ItemCardapio> {
		const categoriaId = opcoes.categoriaId ?? (await this.criarCategoria()).id;
		const { data, error } = await this.admin
			.from('menu_items')
			.insert({
				name: opcoes.nome ?? `Item E2E ${unico()}`,
				description: opcoes.descricao ?? 'Descrição do item de teste',
				price: opcoes.preco ?? 25.9,
				status: opcoes.status ?? 'DISPONIVEL',
				category_id: categoriaId,
			})
			.select()
			.single();
		if (error) throw error;
		this.registrar('itens', data.id);

		const imagem = await this.admin
			.from('menu_item_images')
			.insert({ menu_item_id: data.id, url: `https://placehold.co/600x400/png?text=${encodeURIComponent(data.name)}`, position: 0 });
		if (imagem.error) throw imagem.error;
		return data;
	}

	public async itemPorNome(
		nome: string,
	): Promise<(ItemCardapio & { menu_item_images: { url: string; storage_path: string | null }[] }) | null> {
		const { data, error } = await this.admin
			.from('menu_items')
			.select('*, menu_item_images(url, storage_path, position)')
			.eq('name', nome)
			.maybeSingle();
		if (error) throw error;
		if (data) {
			this.registrar('itens', data.id);
			for (const imagem of data.menu_item_images) {
				if (imagem.storage_path) this.registrar('objetosCardapio', imagem.storage_path);
			}
		}
		return data;
	}

	public async carrinho(usuarioId: string): Promise<{ menu_item_id: string; quantity: number }[]> {
		const { data, error } = await this.admin.from('cart_items').select('menu_item_id, quantity').eq('user_id', usuarioId);
		if (error) throw error;
		return data;
	}

	public async adicionarAoCarrinho(usuarioId: string, menuItemId: string, quantidade = 1): Promise<void> {
		const { error } = await this.admin.from('cart_items').insert({ user_id: usuarioId, menu_item_id: menuItemId, quantity: quantidade });
		if (error) throw error;
	}

	public async favoritos(usuarioId: string): Promise<string[]> {
		const { data, error } = await this.admin.from('favorites').select('menu_item_id').eq('user_id', usuarioId);
		if (error) throw error;
		return data.map((linha) => linha.menu_item_id);
	}

	public async favoritar(usuarioId: string, menuItemId: string): Promise<void> {
		const { error } = await this.admin.from('favorites').insert({ user_id: usuarioId, menu_item_id: menuItemId });
		if (error) throw error;
	}

	public async conversa(usuarioId: string) {
		const { data, error } = await this.admin.from('chat_threads').select('*').eq('user_id', usuarioId).maybeSingle();
		if (error) throw error;
		return data;
	}

	public async mensagens(usuarioId: string) {
		const { data, error } = await this.admin.from('chat_messages').select('*').eq('thread_user_id', usuarioId).order('sent_at');
		if (error) throw error;
		return data;
	}

	/** Grava uma mensagem como se tivesse sido enviada pela tela (sem passar pela RPC). */
	public async enviarMensagem(threadUserId: string, remetenteId: string, texto: string, ehAdmin = false): Promise<void> {
		const conversa = await this.admin
			.from('chat_threads')
			.upsert({ user_id: threadUserId }, { onConflict: 'user_id', ignoreDuplicates: true });
		if (conversa.error) throw conversa.error;
		const mensagem = await this.admin
			.from('chat_messages')
			.insert({ thread_user_id: threadUserId, sender_id: remetenteId, text: texto, is_admin: ehAdmin });
		if (mensagem.error) throw mensagem.error;
		const resumo = await this.admin
			.from('chat_threads')
			.update({
				last_message: texto,
				updated_at: new Date().toISOString(),
				...(ehAdmin ? { user_unread_count: 1 } : { admin_unread_count: 1 }),
			})
			.eq('user_id', threadUserId);
		if (resumo.error) throw resumo.error;
	}

	public async eventosDeItem(menuItemId: string): Promise<number> {
		const { count, error } = await this.admin
			.from('item_view_events')
			.select('id', { count: 'exact', head: true })
			.eq('menu_item_id', menuItemId);
		if (error) throw error;
		return count ?? 0;
	}

	public async loginsDoUsuario(usuarioId: string): Promise<number> {
		const { count, error } = await this.admin.from('login_events').select('id', { count: 'exact', head: true }).eq('user_id', usuarioId);
		if (error) throw error;
		return count ?? 0;
	}

	public async limpar(): Promise<void> {
		const erros: unknown[] = [];
		const executar = async (acao: () => PromiseLike<{ error: unknown }>) => {
			const { error } = await acao();
			if (error) erros.push(error);
		};

		// Itens primeiro (cascata: imagens, carrinho, favoritos, visualizações), depois categorias e usuários.
		if (this.ids.itens.size) {
			const { data } = await this.admin
				.from('menu_item_images')
				.select('storage_path')
				.in('menu_item_id', [...this.ids.itens]);
			for (const imagem of data ?? []) {
				if (imagem.storage_path) this.ids.objetosCardapio.add(imagem.storage_path);
			}
			await executar(() =>
				this.admin
					.from('menu_items')
					.delete()
					.in('id', [...this.ids.itens]),
			);
		}
		if (this.ids.objetosCardapio.size) {
			await executar(() => this.admin.storage.from('cardapio').remove([...this.ids.objetosCardapio]));
		}
		if (this.ids.categorias.size) {
			await executar(() =>
				this.admin
					.from('menu_categories')
					.delete()
					.in('id', [...this.ids.categorias]),
			);
		}
		for (const id of this.ids.usuarios) {
			const fotos = await this.admin.storage.from('fotos-perfil').list(id);
			if (fotos.data?.length) {
				await executar(() => this.admin.storage.from('fotos-perfil').remove(fotos.data.map((foto) => `${id}/${foto.name}`)));
			}
			await executar(() => this.admin.auth.admin.deleteUser(id));
		}

		if (erros.length) {
			throw new Error(`Falha ao limpar dados do teste: ${JSON.stringify(erros)}`);
		}
	}
}
