export interface OpcaoSelect {
	label: string;
	value: string;
}

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
