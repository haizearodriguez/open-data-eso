import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PreguntaGenerada } from '../../models/ejercicio-generado.model';
import { CursoEso } from '../../models/perfil.model';
import { Idioma } from '../../models/texto-lectura.model';

export type MateriaGenerada = 'matematicas' | 'ciencias';

/**
 * IMPORTANTE -- a diferencia de TextosService (lectura), aquí no hay
 * ningún banco curado detrás: cada ejercicio es 100% invención de
 * Gemini a partir del curso y la materia, sin fuente que contrastar.
 * Para matemáticas en concreto esto es un riesgo real: un LLM puede
 * dar una respuesta "correcta" con un error de cálculo silencioso. El
 * prompt (ver server/index.js construirPromptEjercicio) le pide que
 * resuelva paso a paso antes de fijar la respuesta, pero eso reduce
 * el riesgo, no lo elimina. Si esto se usa en producción de verdad,
 * lo razonable sería que un profesor revise una muestra antes de
 * confiar en el banco generado, o mover a una generación basada en
 * plantillas con la respuesta calculada por código (no por el LLM)
 * para matemáticas en concreto.
 */
@Injectable({
  providedIn: 'root',
})
export class EjerciciosGeneradosService {
  private readonly apiBase = `${environment.eustatProxyUrl}/api`;

  constructor(private http: HttpClient) {}

  generarEjercicios(
    materia: MateriaGenerada,
    curso: CursoEso,
    idioma: Idioma,
    numPreguntas = 4,
  ): Observable<PreguntaGenerada[]> {
    return this.http.post<PreguntaGenerada[]>(`${this.apiBase}/generar-ejercicios`, {
      materia,
      curso,
      idioma,
      numPreguntas,
    });
  }
}