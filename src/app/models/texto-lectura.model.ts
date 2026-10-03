export type Idioma = 'es' | 'eu';
export type NivelEso = '1ESO' | '2ESO' | '3ESO' | '4ESO';
export type Genero = 'narrativa' | 'divulgacion';

export interface TextoLectura {
  id: string;
  titulo:string;
  texto: string;
  idioma: Idioma;

  // null hasta que alguien lo cure a mano -- nunca inventar un valor
  // por defecto aquí, mejor null explícito que un dato falso.
  nivel: NivelEso | null;
  tema: string | null;

  genero: Genero;
  longitud: number;        // nº de palabras
}

/**
 * Pregunta de comprensión generada por IA (Gemini) a partir de un
 * TextoLectura concreto -- ver server/index.js POST /api/generar-preguntas.
 * No se guarda junto al texto en textos.json: se genera bajo demanda,
 * por eso vive como tipo aparte y no como campo de TextoLectura.
 */
export interface PreguntaComprension {
  id: string;
  enunciado: string;
  opciones: string[];
  respuestaCorrecta: number; // índice dentro de `opciones`

  // Frase literal del texto (copiada tal cual, no parafraseada) que
  // justifica la respuesta correcta. Sirve para dar contexto al
  // corregir -- generada por Gemini junto con la pregunta, ver
  // server/index.js construirPrompt(). null si Gemini no devolvió una
  // cita que sea realmente un fragmento literal del texto (el propio
  // servidor lo valida con texto.includes(...) antes de mandarla).
  citaTexto: string | null;
}