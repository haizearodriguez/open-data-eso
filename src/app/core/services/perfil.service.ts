import { Injectable } from '@angular/core';
import { Observable, from, map, switchMap } from 'rxjs';

import { PerfilAlumno, CursoEso, ModeloLinguistico } from '../../models/perfil.model';
import { CalibracionService } from './calibracion.service';
import { supabase } from '../supabase.client';

const CLAVE_STORAGE = 'ilbe_perfil_actual';

// Alfabeto sin 0/O, 1/I/L para evitar confusiones al copiar el código a mano.
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * -----------------------------------------------------------------------
 * Local-first: `obtenerPerfilActual()` sigue leyendo de localStorage y
 * sigue siendo síncrono -- "quién está usando este dispositivo ahora
 * mismo" no necesita red. Supabase entra en dos sitios:
 *
 *   - crearPerfil() guarda también en Supabase (tabla `perfiles`),
 *     además de en localStorage. Si falla el guardado en Supabase, el
 *     perfil local se crea igual -- preferimos que el alumno pueda
 *     seguir usando la app en este dispositivo a bloquearlo por un
 *     problema de red ajeno a su sesión. Queda registrado en consola.
 *   - recuperarPerfilPorCodigo() es nuevo: busca en Supabase por
 *     código y, si lo encuentra, lo cachea en localStorage de este
 *     dispositivo. Esto es lo que por fin resuelve la limitación que
 *     teníamos anotada ("el código no servía para nada todavía") --
 *     aunque la pantalla que lo use (recuperar perfil en un
 *     dispositivo nuevo) todavía no existe, ver TODO más abajo.
 *
 * TODO: falta la pantalla de "recuperar mi perfil con un código" en
 * el onboarding -- hoy solo se puede crear perfil nuevo. El método ya
 * está listo para cuando se construya esa pantalla.
 * -----------------------------------------------------------------------
 */
@Injectable({
  providedIn: 'root'
})
export class PerfilService {

  constructor(private calibracionService: CalibracionService) {}

  /**
   * Crea el perfil calculando primero el sesgo_inicial a partir del
   * municipio del centro (llamada a EUSTAT vía CalibracionService).
   */
  crearPerfil(datos: {
    centroId: string;
    centroNombre: string;
    municipioCodigo: string;
    curso: CursoEso;
    grupo: string;
    modeloLinguistico: ModeloLinguistico;
  }): Observable<PerfilAlumno> {

    return this.calibracionService.calcularSesgoInicial(datos.municipioCodigo).pipe(
      switchMap((resultado) => {

        const perfil: PerfilAlumno = {
          ...datos,
          sesgoInicial: resultado.sesgoInicial,
          codigo: this.generarCodigo(),
          creadoEn: new Date().toISOString(),
        };

        // Local-first: el perfil ya es utilizable en este dispositivo
        // aunque el guardado en Supabase tarde o falle.
        localStorage.setItem(CLAVE_STORAGE, JSON.stringify(perfil));

        return from(this.guardarEnSupabase(perfil)).pipe(
          map(() => perfil),
        );
      }),
    );
  }

  /**
   * Busca un perfil en Supabase por su código de recuperación y, si
   * existe, lo cachea en localStorage de ESTE dispositivo (pasa a ser
   * "el perfil actual" aquí también). Devuelve null si el código no
   * corresponde a ningún perfil.
   */
  recuperarPerfilPorCodigo(codigo: string): Observable<PerfilAlumno | null> {
    return from(
      supabase.rpc('obtener_perfil', { p_codigo: codigo.trim().toUpperCase() }),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error recuperando perfil de Supabase:', error);
          throw error;
        }

        const fila = data?.[0];
        if (!fila) {
          return null;
        }

        const perfil = this.filaASupabaseAPerfil(fila);
        localStorage.setItem(CLAVE_STORAGE, JSON.stringify(perfil));
        return perfil;
      }),
    );
  }

  obtenerPerfilActual(): PerfilAlumno | null {
    const raw = localStorage.getItem(CLAVE_STORAGE);
    return raw ? (JSON.parse(raw) as PerfilAlumno) : null;
  }

  limpiarPerfil(): void {
    localStorage.removeItem(CLAVE_STORAGE);
  }

  private async guardarEnSupabase(perfil: PerfilAlumno): Promise<void> {
    const { error } = await supabase.from('perfiles').insert({
      codigo: perfil.codigo,
      centro_id: perfil.centroId,
      centro_nombre: perfil.centroNombre,
      municipio_codigo: perfil.municipioCodigo,
      curso: perfil.curso,
      grupo: perfil.grupo,
      modelo_linguistico: perfil.modeloLinguistico,
      sesgo_inicial: perfil.sesgoInicial,
      creado_en: perfil.creadoEn,
    });

    if (error) {
      // No relanzamos -- ver nota de "local-first" arriba. El perfil
      // local ya se guardó; esto solo afecta a la recuperación entre
      // dispositivos y al futuro dashboard, no a poder usar la app hoy.
      console.error('No se ha podido guardar el perfil en Supabase:', error);
    }
  }

  private filaASupabaseAPerfil(fila: any): PerfilAlumno {
    return {
      codigo: fila.codigo,
      centroId: fila.centro_id,
      centroNombre: fila.centro_nombre,
      municipioCodigo: fila.municipio_codigo,
      curso: fila.curso,
      grupo: fila.grupo,
      modeloLinguistico: fila.modelo_linguistico,
      sesgoInicial: fila.sesgo_inicial,
      creadoEn: fila.creado_en,
    };
  }

  private generarCodigo(): string {
    const parte = (longitud: number) =>
      Array.from(
        { length: longitud },
        () => ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)]
      ).join('');

    return `${parte(3)}-${parte(3)}`;
  }
}