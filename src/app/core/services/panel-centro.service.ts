import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { Session } from '@supabase/supabase-js';

import { supabase } from '../supabase.client';

/**
 * Una fila de resumen_por_grupo, ya filtrada por el centro(s) del
 * usuario autenticado -- ver obtener_resumen_centro() en
 * supabase-schema.sql. Nunca una fila por alumno, solo medias
 * agregadas por curso/grupo/materia.
 */
export interface ResumenGrupo {
  centroId: string;
  centroNombre: string;
  curso: string;
  grupo: string;
  materia: 'lectura' | 'matematicas' | 'ciencias';
  numResultados: number;
  porcentajeAciertos: number | null; // null si num_resultados es 0 (no debería darse, pero por si acaso)
}

/**
 * A diferencia de PerfilService (alumnado, sin autenticación real),
 * aquí sí hay Supabase Auth de verdad: email + contraseña. No hay
 * local-first porque este panel no tiene sentido sin conexión -- son
 * datos agregados de otras personas, no algo que el centro vaya a
 * consultar sin red.
 */
@Injectable({
  providedIn: 'root',
})
export class PanelCentroService {

  obtenerSesionActual(): Observable<Session | null> {
    return from(supabase.auth.getSession()).pipe(
      map(({ data }) => data.session),
    );
  }

  iniciarSesion(email: string, password: string): Observable<Session | null> {
    return from(supabase.auth.signInWithPassword({ email, password })).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data.session;
      }),
    );
  }

  cerrarSesion(): Observable<void> {
    return from(supabase.auth.signOut()).pipe(map(() => undefined));
  }

  obtenerResumen(): Observable<ResumenGrupo[]> {
    return from(supabase.rpc('obtener_resumen_centro')).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }

        return (data ?? []).map((fila: any): ResumenGrupo => ({
          centroId: fila.centro_id,
          centroNombre: fila.centro_nombre,
          curso: fila.curso,
          grupo: fila.grupo,
          materia: fila.materia,
          numResultados: fila.num_resultados,
          porcentajeAciertos: fila.porcentaje_aciertos,
        }));
      }),
    );
  }
}