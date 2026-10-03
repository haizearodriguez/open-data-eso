/**
 * Utilidades de parseo para respuestas EUSTAT en formato json-stat (v1,
 * con el objeto "dataset"). Genéricas: no dependen de ninguna tabla en
 * concreto.
 */

export interface ValorSerie {
  codigo: string;
  texto: string;
  valor: number;
}

/**
 * Usar cuando TODAS las dimensiones de la consulta están fijadas a un
 * único valor (tamaño 1) -- la respuesta trae un solo número.
 * Ej: renta disponible de un municipio en un año concreto.
 */
export function extraerValorUnico(respuesta: any): number {
  const dataset = respuesta?.dataset ?? respuesta;
  return dataset?.value?.[0] ?? 0;
}

/**
 * Usar cuando UNA dimensión varía (el resto están fijadas a tamaño 1)
 * -- devuelve un valor por cada categoría de esa dimensión.
 * Ej: nivel de instrucción con todas sus categorías (Analfabetos ...
 * Superiores) para un municipio y año concretos.
 */
export function extraerSeriePorDimension(respuesta: any, dimensionCode: string): ValorSerie[] {
  const dataset = respuesta?.dataset ?? respuesta;
  const dimension = dataset?.dimension?.[dimensionCode];

  if (!dimension) {
    console.warn(`extraerSeriePorDimension: no se encontró la dimensión "${dimensionCode}" en la respuesta.`);
    return [];
  }

  return Object.entries(dimension.category.index).map(([codigo, posicion]) => ({
    codigo,
    texto: dimension.category.label[codigo],
    valor: dataset.value[posicion as number] ?? 0,
  }));
}