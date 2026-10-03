import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';

import { EustatService, CODIGO_CAE } from './eustat.service';
import { extraerValorUnico, extraerSeriePorDimension } from '../utils/eustat-parser';

// Pesos fijos, decididos por el equipo -- NO aprendidos. Instrucción
// pesa más que renta porque está más directamente relacionada con
// comprensión lectora.
const PESO_INSTRUCCION = 0.6;
const PESO_RENTA = 0.4;

// El sesgo nunca puede mover la dificultad de arranque más de esto
// (sobre una escala de dificultad de 0 a 1) -- es solo un desempate
// para la primera pregunta, nunca un factor determinante.
const LIMITE_SESGO = 0.15;

const CODIGO_NIVEL_TOTAL = '10';
const CODIGO_NIVEL_SUPERIORES = '80';

export interface ResultadoCalibracion {
  sesgoInicial: number;
  porcentajeEstudiosSuperioresZona: number;
  rentaDisponibleZona: number;
}

@Injectable({
  providedIn: 'root',
})
export class CalibracionService {

  constructor(private eustatService: EustatService) {}

  /**
   * Calcula el sesgo_inicial de un municipio comparándolo contra la
   * media de la C.A. de Euskadi. Hace 4 llamadas en paralelo: nivel de
   * instrucción y renta disponible, cada una para la zona y para el
   * total de Euskadi (necesario para tener el denominador del ratio).
   */
  calcularSesgoInicial(municipioCodigo: string): Observable<ResultadoCalibracion> {
    return forkJoin({
      instruccionZona: this.eustatService.getNivelInstruccionMunicipio(municipioCodigo),
      instruccionCae: this.eustatService.getNivelInstruccionMunicipio(CODIGO_CAE),
      rentaZona: this.eustatService.getRentaDisponibleMunicipio(municipioCodigo),
      rentaCae: this.eustatService.getRentaDisponibleMunicipio(CODIGO_CAE),
    }).pipe(
      map(({ instruccionZona, instruccionCae, rentaZona, rentaCae }) => {

        const pctSuperioresZona = this.porcentajeSuperiores(instruccionZona);
        const pctSuperioresCae = this.porcentajeSuperiores(instruccionCae);

        const rentaDisponibleZona = extraerValorUnico(rentaZona);
        const rentaDisponibleCae = extraerValorUnico(rentaCae);

        const ratioInstruccion = pctSuperioresCae > 0 ? pctSuperioresZona / pctSuperioresCae : 1;
        const ratioRenta = rentaDisponibleCae > 0 ? rentaDisponibleZona / rentaDisponibleCae : 1;

        const sesgoBruto =
          PESO_INSTRUCCION * (ratioInstruccion - 1) +
          PESO_RENTA * (ratioRenta - 1);

        const sesgoInicial = this.limitar(sesgoBruto, -LIMITE_SESGO, LIMITE_SESGO);

        // --- Temporal: ver los números intermedios de la fórmula ---
        console.log('--- Cálculo de sesgo_inicial ---');
        console.log(`% superiores zona (${municipioCodigo}):`, pctSuperioresZona.toFixed(2) + '%');
        console.log('% superiores C.A. Euskadi:', pctSuperioresCae.toFixed(2) + '%');
        console.log('ratio_instruccion:', ratioInstruccion.toFixed(4));
        console.log(`Renta disponible zona (${municipioCodigo}):`, rentaDisponibleZona, '€');
        console.log('Renta disponible C.A. Euskadi:', rentaDisponibleCae, '€');
        console.log('ratio_renta:', ratioRenta.toFixed(4));
        console.log('sesgo_bruto:', sesgoBruto.toFixed(4));
        console.log('sesgo_inicial (tras clamp ±' + LIMITE_SESGO + '):', sesgoInicial.toFixed(4));
        console.log('---------------------------------');

        return {
          sesgoInicial,
          porcentajeEstudiosSuperioresZona: pctSuperioresZona,
          rentaDisponibleZona,
        };
      }),
    );
  }

  private porcentajeSuperiores(respuesta: any): number {
    const serie = extraerSeriePorDimension(respuesta, 'nivel de instrucción');

    const total = serie.find((s) => s.codigo === CODIGO_NIVEL_TOTAL)?.valor ?? 0;
    const superiores = serie.find((s) => s.codigo === CODIGO_NIVEL_SUPERIORES)?.valor ?? 0;

    return total > 0 ? (superiores / total) * 100 : 0;
  }

  private limitar(valor: number, minimo: number, maximo: number): number {
    return Math.max(minimo, Math.min(maximo, valor));
  }
}