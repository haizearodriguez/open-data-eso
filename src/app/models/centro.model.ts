/**
 * Registro tal y como llega desde Open Data Euskadi.
 * No modificar estos nombres: corresponden al dataset externo.
 */
export interface CentroEducativoRaw {
  CCEN: string;
  NOM: string;
  NOME: string;

  DGENRC: string;
  DGENRE: string;
  GENR: string;

  MUNI: string;
  DMUNIC: string;
  DMUNIE: string;

  DTERRC: string;
  DTERRE: string;

  DEPE: string;
  DTITUC: string;
  DTITUE: string;

  DOMI: string;
  CPOS: string;

  TEL1: string;
  TFAX: string;
  EMAIL: string;
  PAGINA: string;

  COOR_X: string;
  COOR_Y: string;
}

/**
 * Modelo utilizado internamente por la app. `municipioCodigo` NO es el
 * MUNI crudo del CSV (que viene en 3 cifras, sin prefijo de territorio)
 * -- es la reconstrucción a 5 cifras estilo EUSTAT/INE (ver
 * CentrosService.construirCodigoMunicipioEustat).
 */
export interface CentroEducativo {
  id: string;
  nombre: string;

  municipioCodigo: string;
  municipio: string;

  territorio: string;

  tipoCentro: string;
  tipoCentroEuskera: string;

  titularidadCodigo: string;
  titularidad: string;

  direccion: string;
  codigoPostal: string;

  telefono: string;
  fax: string;
  email: string;
  web: string;

  coordenadaX: number;
  coordenadaY: number;
}