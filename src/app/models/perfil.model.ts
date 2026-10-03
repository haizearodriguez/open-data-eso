export type CursoEso = '1' | '2' | '3' | '4';
export type ModeloLinguistico = 'A' | 'B' | 'D';

export interface PerfilAlumno {
  codigo: string;

  centroId: string;
  centroNombre: string;
  municipioCodigo: string;

  curso: CursoEso;
  grupo: string;
  modeloLinguistico: ModeloLinguistico;

  /**
   * Entre -0.15 y +0.15. Decide solo el PRIMER ejercicio que se le
   * muestra al alumno; a partir de ahí, la dificultad la decide
   * exclusivamente su propio desempeño (algoritmo adaptativo, aparte).
   */
  sesgoInicial: number;

  creadoEn: string; // ISO date
}