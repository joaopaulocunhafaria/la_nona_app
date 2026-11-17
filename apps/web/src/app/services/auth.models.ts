import type { CargoUsuario, Perfil } from '@lanona/shared';

export type AuthProvider = 'local' | 'google';

export type UsuarioRole = CargoUsuario;

export interface EnderecoResponse {
	cep: string | null;
	rua: string | null;
	bairro: string | null;
	numero: string | null;
	cidade: string | null;
	estado: string | null;
	complemento: string | null;
}

/** Usuário logado no formato usado pelas telas (derivado da linha de `profiles`). */
export interface UsuarioResponse {
	id: string;
	email: string;
	name: string;
	photo: string | null;
	provider: AuthProvider;
	role: UsuarioRole;
	isAdmin: boolean;
	onboardingCompleted: boolean;
	address: EnderecoResponse;
	createdAt: string;
	updatedAt: string;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface RegisterRequest {
	email: string;
	password: string;
	name?: string;
}

export interface GoogleLoginRequest {
	idToken: string;
}

export interface AddressRequest {
	cep?: string;
	rua?: string;
	bairro?: string;
	numero?: string;
	cidade?: string;
	estado?: string;
	complemento?: string;
}

/** Converte a linha de `profiles` no modelo das telas. */
export function usuarioDoPerfil(perfil: Perfil): UsuarioResponse {
	return {
		id: perfil.id,
		email: perfil.email,
		name: perfil.name,
		photo: perfil.photo,
		provider: perfil.provider === 'google' ? 'google' : 'local',
		role: perfil.role as UsuarioRole,
		isAdmin: perfil.role === 'admin',
		onboardingCompleted: perfil.onboarding_completed,
		address: {
			cep: perfil.address_cep,
			rua: perfil.address_rua,
			bairro: perfil.address_bairro,
			numero: perfil.address_numero,
			cidade: perfil.address_cidade,
			estado: perfil.address_estado,
			complemento: perfil.address_complemento,
		},
		createdAt: perfil.created_at,
		updatedAt: perfil.updated_at,
	};
}
