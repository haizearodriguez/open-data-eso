import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';

/**
 * Las 3 tablas EUSTAT usadas para calibración por zona. Confirmadas a
 * nivel de municipio con consultas reales (variable "ámbitos
 * territoriales", compartida por las tres).
 */
export const EUSTAT_TABLES = {
  nivelInstruccion: 'PX_040606_ceme_ni03b.px',
  rentaFamiliar: 'PX_173402_crpf_rpf_rf18s.px',
  nivelEuskera: 'PX_010123_cepv3_ne02.px',
} as const;

export type EustatTableKey = keyof typeof EUSTAT_TABLES;

export interface EustatFiltro {
  code: string;
  values: string[] | 'ALL';
}

/**
 * Único año presente en las 3 tablas a la vez (comprobado con datos
 * reales: la intersección de sus periodos disponibles es {2016, 2021};
 * se usa el más reciente).
 */
export const PERIODO_CALIBRACION = '2021';

/** Código de la C.A. de Euskadi completa, para calcular la media de referencia. */
export const CODIGO_CAE = '00001';

@Injectable({
  providedIn: 'root',
})
export class EustatService {
  // Metadatos: GET directo a EUSTAT (confirmado sin problemas de CORS).
  private readonly apiEustat = 'https://www.eustat.eus/bankupx/api/v1/es/DB';

  // Datos: POST a través de nuestro proxy propio (server/), porque el
  // navegador bloquea el POST directo a EUSTAT por CORS.
  private readonly apiProxy = `${environment.eustatProxyUrl}/api/eustat-proxy`;

  private metadataCache = new Map<EustatTableKey, Observable<any>>();

  constructor(private http: HttpClient) {}

  getMetadata(tabla: EustatTableKey): Observable<any> {
    if (!this.metadataCache.has(tabla)) {
      const file = EUSTAT_TABLES[tabla];

      const request$ = this.http
        .get<any>(`${this.apiEustat}/${file}`)
        .pipe(shareReplay(1));

      this.metadataCache.set(tabla, request$);
    }

    return this.metadataCache.get(tabla)!;
  }

  getData(tabla: EustatTableKey, filtros: EustatFiltro[]): Observable<any> {
    const file = EUSTAT_TABLES[tabla];

    const body = {
      query: filtros.map((f) => ({
        code: f.code,
        selection:
          f.values === 'ALL'
            ? { filter: 'all', values: ['*'] }
            : { filter: 'item', values: f.values },
      })),
      response: {
        format: 'json-stat',
      },
    };

    return this.http.post<any>(`${this.apiProxy}/${file}`, body);
  }

  /**
   * Desglose completo de nivel de instrucción de la población adulta
   * del municipio (o de "00001" para la media de la C.A. de Euskadi).
   */
  getNivelInstruccionMunicipio(municipioCodigo: string): Observable<any> {
    return this.getData('nivelInstruccion', [
      { code: 'ámbitos territoriales', values: [municipioCodigo] },
      { code: 'nivel de instrucción', values: 'ALL' },
      { code: 'periodo', values: [PERIODO_CALIBRACION] },
    ]);
  }

  /**
   * Renta disponible media (código "160") del municipio. Sexo fijado
   * a Total ("10").
   */
  getRentaDisponibleMunicipio(municipioCodigo: string): Observable<any> {
    return this.getData('rentaFamiliar', [
      { code: 'ámbitos territoriales', values: [municipioCodigo] },
      { code: 'tipo de renta', values: ['160'] },
      { code: 'sexo', values: ['10'] },
      { code: 'periodo', values: [PERIODO_CALIBRACION] },
    ]);
  }

  /**
   * Desglose completo de nivel de euskera del municipio. NO entra en
   * la fórmula de dificultad -- se usa aparte, para decidir apoyo
   * léxico en los textos en euskera.
   */
  getNivelEuskeraMunicipio(municipioCodigo: string): Observable<any> {
    return this.getData('nivelEuskera', [
      { code: 'ámbitos territoriales', values: [municipioCodigo] },
      { code: 'nivel de euskera', values: 'ALL' },
      { code: 'periodo', values: [PERIODO_CALIBRACION] },
    ]);
  }
}