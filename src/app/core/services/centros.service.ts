import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import Papa from 'papaparse';

import { CentroEducativo, CentroEducativoRaw } from '../../models/centro.model';

// El CSV de Open Data Euskadi da el municipio en 3 cifras (p.ej. "059"
// para Vitoria-Gasteiz) SIN el prefijo de territorio histórico. EUSTAT
// (y el estándar INE) usan 5 cifras: prefijo + esas 3 cifras
// (Vitoria-Gasteiz = "01059"). Confirmado con datos reales.
const PREFIJO_TERRITORIO: { patron: RegExp; prefijo: string }[] = [
  { patron: /araba|alava/i, prefijo: '01' },
  { patron: /gipuzkoa|guipuzcoa/i, prefijo: '20' },
  { patron: /bizkaia|vizcaya/i, prefijo: '48' },
];

@Injectable({
  providedIn: 'root'
})
export class CentrosService {

  private readonly http = inject(HttpClient);

  private readonly url =
    'https://opendata.euskadi.eus/contenidos/ds_localizaciones/centros_docentes_no_universit/es_euskadi/adjuntos/dirgennouniv.csv';

  private centros: CentroEducativo[] = [];

  getCentros(): Observable<CentroEducativo[]> {
    return this.http.get(this.url, {
      responseType: 'arraybuffer'
    }).pipe(
      map((buffer: ArrayBuffer) => {

        const decoder = new TextDecoder('windows-1252');
        const csv = decoder.decode(buffer);

        const resultado = Papa.parse<CentroEducativoRaw>(csv, {
          header: true,
          delimiter: ';',
          skipEmptyLines: true
        });

        this.centros = resultado.data.map(
          (row: CentroEducativoRaw) => this.transformarCentro(row)
        );

        return this.centros;
      })
    );
  }

  buscarCentros(texto: string): CentroEducativo[] {
    const busqueda = this.normalizarTexto(texto);

    if (!busqueda) {
      return [];
    }

    return this.centros.filter(centro =>
      this.normalizarTexto(centro.nombre).includes(busqueda) ||
      this.normalizarTexto(centro.municipio).includes(busqueda)
    );
  }

  private transformarCentro(row: CentroEducativoRaw): CentroEducativo {
    return {
      id: row.CCEN,
      nombre: row.NOM,

      municipioCodigo: this.construirCodigoMunicipioEustat(row.DTERRC, row.MUNI),
      municipio: row.DMUNIC,

      territorio: row.DTERRC,

      tipoCentro: row.DGENRC,
      tipoCentroEuskera: row.DGENRE,

      titularidadCodigo: row.DEPE,
      titularidad: row.DTITUC,

      direccion: row.DOMI,
      codigoPostal: row.CPOS,

      telefono: row.TEL1,
      fax: row.TFAX,
      email: row.EMAIL,
      web: row.PAGINA,

      coordenadaX: Number(row.COOR_X),
      coordenadaY: Number(row.COOR_Y)
    };
  }

  private construirCodigoMunicipioEustat(territorioTexto: string, muniRaw: string): string {
    const muni = (muniRaw ?? '').trim().padStart(3, '0');

    const coincidencia = PREFIJO_TERRITORIO.find(
      (t) => t.patron.test(territorioTexto ?? '')
    );

    if (!coincidencia) {
      console.warn(
        `No se reconoce el territorio "${territorioTexto}" para construir el código EUSTAT del municipio "${muniRaw}".`
      );
      return muni;
    }

    return `${coincidencia.prefijo}${muni}`;
  }

  private normalizarTexto(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}