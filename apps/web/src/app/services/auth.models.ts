export type AuthProvider = 'local' | 'google';

export type UsuarioRole = 'cliente' | 'entregador' | 'admin';

export interface EnderecoResponse {
	cep: string | null;
	rua: string | null;
	bairro: string | null;
	numero: string | null;
	cidade: string | null;
	estado: string | null;
	complemento: string | null;
}

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

export interface AuthResponse {
	accessToken: string;
	refreshToken: string;
	user: UsuarioResponse;
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

export interface PhotoRequest {
	imageBase64: string;
	contentType: string;
}
