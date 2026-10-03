import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/**
 * Cliente único de Supabase para toda la app. No hace falta un
 * servicio Angular alrededor de esto -- el cliente de supabase-js ya
 * es un singleton seguro de compartir, igual que harías con HttpClient.
 *
 * La clave usada aquí es la "anon" (pública) -- ver supabase-schema.sql
 * para cómo Row Level Security limita lo que se puede hacer con ella.
 */
export const supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);