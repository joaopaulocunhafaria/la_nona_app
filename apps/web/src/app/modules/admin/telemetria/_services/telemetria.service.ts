import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { SupabaseService } from '../../../../services/supabase.service';
import { deSupabase } from '../../../../utils/_metodos/supabase';

export interface OnlineCount {
	loggedIn: number;
	anonymous: number;
}

export interface TimeBucket {
	bucket: string;
	count: number;
}

export interface LoginMetrics {
	total: number;
	distinctUsers: number;
	series: TimeBucket[];
}

export interface MenuViewMetrics {
	total: number;
	series: TimeBucket[];
}

export interface UserDuration {
	label: string;
	anonymous: boolean;
	totalActiveSeconds: number;
	sessionCount: number;
}

export interface SessionDurations {
	avgActiveSeconds: number;
	totalSessions: number;
	ranking: UserDuration[];
}

export interface TopItem {
	menuItemId: string;
	name: string;
	views: number;
}

export interface Periodo {
	from?: string;
	to?: string;
}

/** Consultas do painel de telemetria (RPCs `telemetria_*`, restritas a administradores). */
@Injectable({ providedIn: 'root' })
export class TelemetriaService {
	constructor(private readonly supabaseService: SupabaseService) {}

	online(): Observable<OnlineCount> {
		return this.rpc<OnlineCount>(this.supabaseService.client.rpc('telemetria_online'));
	}

	logins(periodo: Periodo, granularity: 'hour' | 'day'): Observable<LoginMetrics> {
		return this.rpc<LoginMetrics>(
			this.supabaseService.client.rpc('telemetria_logins', { ...this.comPeriodo(periodo), p_granularidade: granularity }),
		);
	}

	acessosMenu(periodo: Periodo, granularity: 'hour' | 'day'): Observable<MenuViewMetrics> {
		return this.rpc<MenuViewMetrics>(
			this.supabaseService.client.rpc('telemetria_acessos_menu', { ...this.comPeriodo(periodo), p_granularidade: granularity }),
		);
	}

	sessoes(periodo: Periodo, limit = 20): Observable<SessionDurations> {
		return this.rpc<SessionDurations>(this.supabaseService.client.rpc('telemetria_sessoes', { ...this.comPeriodo(periodo), p_limite: limit }));
	}

	itensMaisVistos(periodo: Periodo, limit = 10): Observable<TopItem[]> {
		return this.rpc<TopItem[]>(
			this.supabaseService.client.rpc('telemetria_itens_mais_vistos', { ...this.comPeriodo(periodo), p_limite: limit }),
		);
	}

	private rpc<T>(consulta: PromiseLike<{ data: unknown; error: Error | null }>): Observable<T> {
		return deSupabase(consulta).pipe(map((dados) => dados as T));
	}

	private comPeriodo(periodo: Periodo): { p_de?: string; p_ate?: string } {
		return {
			...(periodo.from ? { p_de: periodo.from } : {}),
			...(periodo.to ? { p_ate: periodo.to } : {}),
		};
	}
}
