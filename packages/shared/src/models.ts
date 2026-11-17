import type { Tables, TablesInsert } from './database.types';

/**
 * Aliases de domínio sobre os tipos gerados pelo Supabase (`npm run db:types`).
 * Adicione aqui um alias por tabela para usar no front.
 */

/** Perfil do usuário (1:1 com auth.users). `role = 'admin'` libera a área administrativa. */
export type Perfil = Tables<'profiles'>;
export type CargoUsuario = 'cliente' | 'entregador' | 'admin';

/** Categoria do cardápio (cadastrada pelo admin). */
export type CategoriaCardapio = Tables<'menu_categories'>;
export type CategoriaCardapioInsert = TablesInsert<'menu_categories'>;

/** Item do cardápio. Gravação via RPC `salvar_item_cardapio`. */
export type ItemCardapio = Tables<'menu_items'>;
export type ImagemItemCardapio = Tables<'menu_item_images'>;
export type StatusItemCardapio = 'DISPONIVEL' | 'FEITO_NA_HORA' | 'VERIFICAR_DISPONIBILIDADE' | 'INDISPONIVEL';

/** Linha do carrinho (total sempre pelo preço atual do item). Inclusão via RPC `adicionar_ao_carrinho`. */
export type ItemCarrinho = Tables<'cart_items'>;
export type Favorito = Tables<'favorites'>;

/** Chat de suporte: uma conversa por cliente. Envio via RPC `enviar_mensagem_chat`. */
export type ConversaChat = Tables<'chat_threads'>;
export type MensagemChat = Tables<'chat_messages'>;

/** Plataforma de origem da telemetria. */
export type PlataformaTelemetria = 'WEB' | 'MOBILE';
