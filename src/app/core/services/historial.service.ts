import { Injectable } from '@angular/core';

import { supabase } from '../supabase.client';

export type Materia = 'lectura' | 'matematicas' | 'ciencias';

export interface ResultadoEjercicio {
  materia: Materia;

  // Código del perfil al que pertenece este resultado -- hace falta
  // para poder guardarlo en Supabase asociado al alumno correcto (la
  // tabla `resultados` tiene una FK a `perfiles.codigo`).
  perfilCodigo: string;

  // id del recurso concreto (ej. el id de un TextoLectura) -- útil el
  // día que queramos evitar repetir el mismo ejercicio dos veces.
  refId: string;
  titulo: string;

  aciertos: number;
  total: number;

  fecha: string; // ISO
}

export interface ResumenMateria {
  numResultados: number;
  porcentajeAciertos: number; // 0-100, redondeado. 0 si no hay resultados.
  ultimoResultado: ResultadoEjercicio | null;
}

const CLAVE_STORAGE = 'ilbe_historial';

/**
 * Local-first, igual que PerfilService: `obtenerHistorial()` y
 * `obtenerResumen()` siguen leyendo de localStorage y siguen siendo
 * síncronos -- Home y las páginas de ejercicio no necesitan tocarse
 * para seguir funcionando igual de rápido.
 *
 * `guardarResultado()` ahora también manda el resultado a Supabase
 * (tabla `resultados`), en segundo plano y sin bloquear ni esperar
 * respuesta -- si falla, se queda registrado en consola pero el
 * alumno ya ha visto su corrección, que es lo que importa en el
 * momento. Ese envío es lo que alimentará el futuro dashboard
 * agregado de centro (ver resumen_por_grupo en supabase-schema.sql),
 * que esta app todavía no consulta -- hoy nadie lee la tabla
 * `resultados` de vuelta, solo se escribe en ella.
 */
@Injectable({
  providedIn: 'root',
})
export class HistorialService {

  guardarResultado(resultado: ResultadoEjercicio): void {
    const historial = this.obtenerHistorial();
    historial.push(resultado);
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(historial));

    this.guardarEnSupabase(resultado);
  }

  obtenerHistorial(materia?: Materia): ResultadoEjercicio[] {
    const raw = localStorage.getItem(CLAVE_STORAGE);
    const todos: ResultadoEjercicio[] = raw ? JSON.parse(raw) : [];
    return materia ? todos.filter((r) => r.materia === materia) : todos;
  }

  obtenerResumen(materia: Materia): ResumenMateria {
    const resultados = this.obtenerHistorial(materia);

    const totalAciertos = resultados.reduce((acc, r) => acc + r.aciertos, 0);
    const totalPreguntas = resultados.reduce((acc, r) => acc + r.total, 0);

    return {
      numResultados: resultados.length,
      porcentajeAciertos: totalPreguntas > 0 ? Math.round((totalAciertos / totalPreguntas) * 100) : 0,
      ultimoResultado: resultados.length > 0 ? resultados[resultados.length - 1] : null,
    };
  }

  private async guardarEnSupabase(resultado: ResultadoEjercicio): Promise<void> {
    const { error } = await supabase.from('resultados').insert({
      perfil_codigo: resultado.perfilCodigo,
      materia: resultado.materia,
      ref_id: resultado.refId,
      titulo: resultado.titulo,
      aciertos: resultado.aciertos,
      total: resultado.total,
      fecha: resultado.fecha,
    });

    if (error) {
      console.error('No se ha podido guardar el resultado en Supabase:', error);
    }
  }
}