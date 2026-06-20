export interface OpcaoSelect {
	label: string;
	value: string;
}

export const CATEGORIAS_MENU: OpcaoSelect[] = [
	{ label: 'Hamburguer', value: 'HAMBURGUER' },
	{ label: 'Pizza', value: 'PIZZA' },
	{ label: 'Salada', value: 'SALADA' },
	{ label: 'Bebida', value: 'BEBIDA' },
	{ label: 'Sobremesa', value: 'SOBREMESA' },
	{ label: 'Acompanhamento', value: 'ACOMPANHAMENTO' },
	{ label: 'Outro', value: 'OUTRO' },
];

export const UFS_BRASIL: string[] = [
	'AC',
	'AL',
	'AP',
	'AM',
	'BA',
	'CE',
	'DF',
	'ES',
	'GO',
	'MA',
	'MT',
	'MS',
	'MG',
	'PA',
	'PB',
	'PR',
	'PE',
	'PI',
	'RJ',
	'RN',
	'RS',
	'RO',
	'RR',
	'SC',
	'SP',
	'SE',
	'TO',
];

export const ROLES_USUARIO: OpcaoSelect[] = [
	{ label: 'Cliente', value: 'cliente' },
	{ label: 'Entregador', value: 'entregador' },
	{ label: 'Admin', value: 'admin' },
];
