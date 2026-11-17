export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: { Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }; Returns: Json };
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			cart_items: {
				Row: {
					added_at: string;
					id: string;
					menu_item_id: string;
					quantity: number;
					user_id: string;
				};
				ComputedFields: never;
				Insert: {
					added_at?: string;
					id?: string;
					menu_item_id: string;
					quantity: number;
					user_id?: string;
				};
				Update: {
					added_at?: string;
					id?: string;
					menu_item_id?: string;
					quantity?: number;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'cart_items_menu_item_id_fkey';
						columns: ['menu_item_id'];
						isOneToOne: false;
						referencedRelation: 'menu_items';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'cart_items_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
				];
			};
			chat_messages: {
				Row: {
					id: string;
					is_admin: boolean;
					sender_id: string;
					sent_at: string;
					text: string;
					thread_user_id: string;
				};
				ComputedFields: never;
				Insert: {
					id?: string;
					is_admin?: boolean;
					sender_id: string;
					sent_at?: string;
					text: string;
					thread_user_id: string;
				};
				Update: {
					id?: string;
					is_admin?: boolean;
					sender_id?: string;
					sent_at?: string;
					text?: string;
					thread_user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'chat_messages_sender_id_fkey';
						columns: ['sender_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'chat_messages_thread_user_id_fkey';
						columns: ['thread_user_id'];
						isOneToOne: false;
						referencedRelation: 'chat_threads';
						referencedColumns: ['user_id'];
					},
				];
			};
			chat_threads: {
				Row: {
					admin_unread_count: number;
					last_message: string | null;
					updated_at: string;
					user_id: string;
					user_unread_count: number;
				};
				ComputedFields: never;
				Insert: {
					admin_unread_count?: number;
					last_message?: string | null;
					updated_at?: string;
					user_id: string;
					user_unread_count?: number;
				};
				Update: {
					admin_unread_count?: number;
					last_message?: string | null;
					updated_at?: string;
					user_id?: string;
					user_unread_count?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'chat_threads_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: true;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
				];
			};
			favorites: {
				Row: {
					created_at: string;
					id: string;
					menu_item_id: string;
					user_id: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					id?: string;
					menu_item_id: string;
					user_id?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					menu_item_id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'favorites_menu_item_id_fkey';
						columns: ['menu_item_id'];
						isOneToOne: false;
						referencedRelation: 'menu_items';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'favorites_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
				];
			};
			item_view_events: {
				Row: {
					anonymous_id: string | null;
					created_at: string;
					id: string;
					menu_item_id: string;
					platform: string | null;
					user_id: string | null;
				};
				ComputedFields: never;
				Insert: {
					anonymous_id?: string | null;
					created_at?: string;
					id?: string;
					menu_item_id: string;
					platform?: string | null;
					user_id?: string | null;
				};
				Update: {
					anonymous_id?: string | null;
					created_at?: string;
					id?: string;
					menu_item_id?: string;
					platform?: string | null;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'item_view_events_menu_item_id_fkey';
						columns: ['menu_item_id'];
						isOneToOne: false;
						referencedRelation: 'menu_items';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'item_view_events_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
				];
			};
			login_events: {
				Row: {
					created_at: string;
					id: string;
					platform: string | null;
					user_id: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					id?: string;
					platform?: string | null;
					user_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					platform?: string | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'login_events_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
				];
			};
			menu_categories: {
				Row: {
					created_at: string;
					id: string;
					name: string;
					updated_at: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					id?: string;
					name: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					name?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			menu_item_images: {
				Row: {
					created_at: string;
					id: string;
					menu_item_id: string;
					position: number;
					storage_path: string | null;
					url: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					id?: string;
					menu_item_id: string;
					position?: number;
					storage_path?: string | null;
					url: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					menu_item_id?: string;
					position?: number;
					storage_path?: string | null;
					url?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'menu_item_images_menu_item_id_fkey';
						columns: ['menu_item_id'];
						isOneToOne: false;
						referencedRelation: 'menu_items';
						referencedColumns: ['id'];
					},
				];
			};
			menu_items: {
				Row: {
					category_id: string;
					created_at: string;
					description: string;
					id: string;
					name: string;
					price: number;
					status: string;
					updated_at: string;
				};
				ComputedFields: never;
				Insert: {
					category_id: string;
					created_at?: string;
					description: string;
					id?: string;
					name: string;
					price: number;
					status?: string;
					updated_at?: string;
				};
				Update: {
					category_id?: string;
					created_at?: string;
					description?: string;
					id?: string;
					name?: string;
					price?: number;
					status?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'menu_items_category_id_fkey';
						columns: ['category_id'];
						isOneToOne: false;
						referencedRelation: 'menu_categories';
						referencedColumns: ['id'];
					},
				];
			};
			menu_view_events: {
				Row: {
					anonymous_id: string | null;
					created_at: string;
					id: string;
					platform: string | null;
					user_id: string | null;
				};
				ComputedFields: never;
				Insert: {
					anonymous_id?: string | null;
					created_at?: string;
					id?: string;
					platform?: string | null;
					user_id?: string | null;
				};
				Update: {
					anonymous_id?: string | null;
					created_at?: string;
					id?: string;
					platform?: string | null;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'menu_view_events_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
				];
			};
			profiles: {
				Row: {
					address_bairro: string | null;
					address_cep: string | null;
					address_cidade: string | null;
					address_complemento: string | null;
					address_estado: string | null;
					address_numero: string | null;
					address_rua: string | null;
					created_at: string;
					email: string;
					id: string;
					name: string;
					onboarding_completed: boolean;
					photo: string | null;
					provider: string;
					role: string;
					updated_at: string;
				};
				ComputedFields: never;
				Insert: {
					address_bairro?: string | null;
					address_cep?: string | null;
					address_cidade?: string | null;
					address_complemento?: string | null;
					address_estado?: string | null;
					address_numero?: string | null;
					address_rua?: string | null;
					created_at?: string;
					email: string;
					id: string;
					name?: string;
					onboarding_completed?: boolean;
					photo?: string | null;
					provider?: string;
					role?: string;
					updated_at?: string;
				};
				Update: {
					address_bairro?: string | null;
					address_cep?: string | null;
					address_cidade?: string | null;
					address_complemento?: string | null;
					address_estado?: string | null;
					address_numero?: string | null;
					address_rua?: string | null;
					created_at?: string;
					email?: string;
					id?: string;
					name?: string;
					onboarding_completed?: boolean;
					photo?: string | null;
					provider?: string;
					role?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			telemetry_sessions: {
				Row: {
					active_seconds: number;
					anonymous_id: string;
					ended_at: string | null;
					id: string;
					last_seen_at: string;
					platform: string;
					started_at: string;
					user_id: string | null;
				};
				ComputedFields: never;
				Insert: {
					active_seconds?: number;
					anonymous_id: string;
					ended_at?: string | null;
					id?: string;
					last_seen_at?: string;
					platform: string;
					started_at?: string;
					user_id?: string | null;
				};
				Update: {
					active_seconds?: number;
					anonymous_id?: string;
					ended_at?: string | null;
					id?: string;
					last_seen_at?: string;
					platform?: string;
					started_at?: string;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'telemetry_sessions_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			adicionar_ao_carrinho: { Args: { p_menu_item_id: string; p_quantidade?: number }; Returns: undefined };
			admin_alterar_cargo: {
				Args: { p_id: string; p_role: string };
				Returns: {
					address_bairro: string | null;
					address_cep: string | null;
					address_cidade: string | null;
					address_complemento: string | null;
					address_estado: string | null;
					address_numero: string | null;
					address_rua: string | null;
					created_at: string;
					email: string;
					id: string;
					name: string;
					onboarding_completed: boolean;
					photo: string | null;
					provider: string;
					role: string;
					updated_at: string;
				};
				SetofOptions: {
					from: '*';
					to: 'profiles';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			admin_buscar_usuarios: {
				Args: { p_busca?: string };
				Returns: {
					address_bairro: string | null;
					address_cep: string | null;
					address_cidade: string | null;
					address_complemento: string | null;
					address_estado: string | null;
					address_numero: string | null;
					address_rua: string | null;
					created_at: string;
					email: string;
					id: string;
					name: string;
					onboarding_completed: boolean;
					photo: string | null;
					provider: string;
					role: string;
					updated_at: string;
				}[];
				SetofOptions: {
					from: '*';
					to: 'profiles';
					isOneToOne: false;
					isSetofReturn: true;
				};
			};
			atualizar_foto: {
				Args: { p_url: string };
				Returns: {
					address_bairro: string | null;
					address_cep: string | null;
					address_cidade: string | null;
					address_complemento: string | null;
					address_estado: string | null;
					address_numero: string | null;
					address_rua: string | null;
					created_at: string;
					email: string;
					id: string;
					name: string;
					onboarding_completed: boolean;
					photo: string | null;
					provider: string;
					role: string;
					updated_at: string;
				};
				SetofOptions: {
					from: '*';
					to: 'profiles';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			eh_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
			encerrar_sessao_telemetria: { Args: { p_segundos?: number; p_sessao: string }; Returns: undefined };
			enviar_mensagem_chat: {
				Args: { p_texto: string; p_thread_user_id: string };
				Returns: {
					id: string;
					is_admin: boolean;
					sender_id: string;
					sent_at: string;
					text: string;
					thread_user_id: string;
				};
				SetofOptions: {
					from: '*';
					to: 'chat_messages';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			exigir_admin: { Args: Record<PropertyKey, never>; Returns: undefined };
			heartbeat_telemetria: { Args: { p_segundos?: number; p_sessao: string }; Returns: undefined };
			iniciar_sessao_telemetria: { Args: { p_anonymous_id: string; p_plataforma?: string }; Returns: string };
			marcar_chat_lido: { Args: { p_como: string; p_thread_user_id: string }; Returns: undefined };
			normalizar_anonymous_id: { Args: { p_anonymous_id: string }; Returns: string };
			normalizar_plataforma: { Args: { p_plataforma: string }; Returns: string };
			registrar_acesso_menu: { Args: { p_anonymous_id: string; p_plataforma?: string }; Returns: undefined };
			registrar_login: { Args: { p_plataforma?: string }; Returns: undefined };
			registrar_visualizacao_item: {
				Args: { p_anonymous_id: string; p_menu_item_id: string; p_plataforma?: string };
				Returns: undefined;
			};
			salvar_endereco: {
				Args: {
					p_bairro: string;
					p_cep: string;
					p_cidade: string;
					p_complemento?: string;
					p_estado: string;
					p_numero: string;
					p_rua: string;
				};
				Returns: {
					address_bairro: string | null;
					address_cep: string | null;
					address_cidade: string | null;
					address_complemento: string | null;
					address_estado: string | null;
					address_numero: string | null;
					address_rua: string | null;
					created_at: string;
					email: string;
					id: string;
					name: string;
					onboarding_completed: boolean;
					photo: string | null;
					provider: string;
					role: string;
					updated_at: string;
				};
				SetofOptions: {
					from: '*';
					to: 'profiles';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			salvar_item_cardapio: { Args: { p_dados: Json; p_id: string; p_imagens: Json }; Returns: string };
			telemetria_acessos_menu: { Args: { p_ate?: string; p_de?: string; p_granularidade?: string }; Returns: Json };
			telemetria_itens_mais_vistos: { Args: { p_ate?: string; p_de?: string; p_limite?: number }; Returns: Json };
			telemetria_logins: { Args: { p_ate?: string; p_de?: string; p_granularidade?: string }; Returns: Json };
			telemetria_online: { Args: Record<PropertyKey, never>; Returns: Json };
			telemetria_sessoes: { Args: { p_ate?: string; p_de?: string; p_limite?: number }; Returns: Json };
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
	EnumName extends (DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	graphql_public: {
		Enums: {},
	},
	public: {
		Enums: {},
	},
} as const;
