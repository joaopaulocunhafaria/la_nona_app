import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

export const TemaApp = definePreset(Aura, {
	semantic: {
		primary: {
			50: '#eef4ec',
			100: '#cfe0cb',
			200: '#aecba9',
			300: '#8bb588',
			400: '#699f67',
			500: '#3b6b3e',
			600: '#254d27',
			700: '#1e3a1f',
			800: '#163017',
			900: '#0f1f10',
			950: '#0a1509',
		},
		colorScheme: {
			light: {
				surface: {
					0: '#ffffff',
					50: '#f5f6f2',
					100: '#eef4ec',
					200: '#e9efe6',
					300: '#d8e2d3',
					400: '#b7c5b1',
					500: '#8a9b85',
					600: '#5c8f61',
					700: '#4b5a4c',
					800: '#2f5d33',
					900: '#163017',
					950: '#0f1f10',
				},
				primary: {
					color: '#254d27',
					contrastColor: '#f5f6f2',
					hoverColor: '#1e3a1f',
					activeColor: '#163017',
				},
				highlight: {
					background: '#eef4ec',
					focusBackground: '#e9efe6',
					color: '#163017',
					focusColor: '#0f1f10',
				},
			},
		},
	},
});
