import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@lanona/shared';
import { environment } from '../../environments/environment';

/** Cliente Supabase único e tipado. Os demais serviços usam `this.supabaseService.client`. */
@Injectable({
	providedIn: 'root',
})
export class SupabaseService {
	public readonly client: SupabaseClient<Database> = createClient<Database>(environment.supabaseUrl, environment.supabaseKey, {
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: false,
		},
	});
}
