/**
 * Pregunta de opción múltiple generada por Gemini para Matemáticas o
 * Ciencias -- a diferencia de PreguntaComprension (lectura), aquí NO
 * hay un texto de origen del que partir: el enunciado completo lo
 * inventa la IA a partir solo del curso y la materia. Por eso, en vez
 * de `citaTexto` (una cita literal verificable), lleva `explicacion`
 * (el razonamiento de la IA, que no se puede verificar automáticamente
 * contra nada -- ver el aviso en ejercicios-generados.service.ts).
 */
export interface PreguntaGenerada {
  id: string;
  enunciado: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacion: string;
}