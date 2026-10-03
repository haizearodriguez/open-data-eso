import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular/lazy';
import { Observable, Subject, of, switchMap, map, catchError, startWith } from 'rxjs';

import {
  EustatService,
  EUSTAT_TABLES,
  EustatTableKey,
  EustatFiltro,
} from '../../core/services/eustat.service';

import { CentrosService } from '../../core/services/centros.service';
import { CentroEducativo } from '../../models/centro.model';


interface ResumenVariable {
  code: string;
  numValores: number;
  primerosValores: string;
  primerosTextos: string;
}

interface EstadoMetadata {
  cargando: boolean;
  error: string;
  datos: any;
  variables: ResumenVariable[];
}

interface EstadoCentros {
  cargando: boolean;
  error: string;
  centros: CentroEducativo[];
}

interface EstadoConsultaZona {
  cargando: boolean;
  error: string;
  resultado: any;
  centro: CentroEducativo | null;
}

// Nombre real de la variable geográfica compartida por las 3 tablas
// (confirmado con getMetadata: aparece igual en las tres).
const VARIABLE_MUNICIPIO = 'ámbitos territoriales';

const ETIQUETA_TABLA: Record<EustatTableKey, string> = {
  nivelInstruccion: 'Nivel de instrucción',
  rentaFamiliar: 'Renta familiar',
  nivelEuskera: 'Nivel de euskera',
};


@Component({
  selector: 'app-pruebas',
  templateUrl: './pruebas.page.html',
  styleUrls: ['./pruebas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class PruebasPage {

  readonly tablas: EustatTableKey[] =
    Object.keys(EUSTAT_TABLES) as EustatTableKey[];

  readonly etiquetaTabla = ETIQUETA_TABLA;

  // Toggle puro de UI (se activa desde un click, funciona bien como
  // propiedad normal en zoneless).
  mostrarJsonCompleto: Record<EustatTableKey, boolean> =
    this.tablas.reduce((acc, tabla) => {
      acc[tabla] = false;
      return acc;
    }, {} as Record<EustatTableKey, boolean>);


  // =====================================================
  // METADATOS (uno por tabla)
  // =====================================================

  private triggerMetadata: Record<EustatTableKey, Subject<void>> =
    this.tablas.reduce((acc, tabla) => {
      acc[tabla] = new Subject<void>();
      return acc;
    }, {} as Record<EustatTableKey, Subject<void>>);

  estadoPorTabla$: Record<EustatTableKey, Observable<EstadoMetadata>>;


  // =====================================================
  // CENTROS (Open Data Euskadi)
  // =====================================================

  private centrosTrigger$ = new Subject<void>();
  estadoCentros$: Observable<EstadoCentros>;


  // =====================================================
  // PRUEBA REAL POR MUNICIPIO: una por cada tabla de zona,
  // construida dinámicamente a partir de sus metadatos ya
  // cargados (nada de códigos de valor inventados).
  // =====================================================

  private triggerZona: Record<EustatTableKey, Subject<CentroEducativo>> =
    this.tablas.reduce((acc, tabla) => {
      acc[tabla] = new Subject<CentroEducativo>();
      return acc;
    }, {} as Record<EustatTableKey, Subject<CentroEducativo>>);

  estadoZona$: Record<EustatTableKey, Observable<EstadoConsultaZona>>;


  constructor(
    private eustatService: EustatService,
    private centrosService: CentrosService,
  ) {

    this.estadoPorTabla$ = this.tablas.reduce((acc, tabla) => {
      acc[tabla] = this.triggerMetadata[tabla].pipe(
        switchMap(() => this.pedirMetadata(tabla)),
        startWith(this.estadoMetadataVacio()),
      );
      return acc;
    }, {} as Record<EustatTableKey, Observable<EstadoMetadata>>);

    this.estadoCentros$ = this.centrosTrigger$.pipe(
      switchMap(() => this.pedirCentros()),
      startWith(this.estadoCentrosVacio()),
    );

    this.estadoZona$ = this.tablas.reduce((acc, tabla) => {
      acc[tabla] = this.triggerZona[tabla].pipe(
        switchMap((centro) => this.pedirTablaZona(tabla, centro)),
        startWith(this.estadoZonaVacio()),
      );
      return acc;
    }, {} as Record<EustatTableKey, Observable<EstadoConsultaZona>>);
  }


  // =====================================================
  // ACCIONES DISPARADAS DESDE LA PLANTILLA
  // =====================================================

  verMetadatos(tabla: EustatTableKey): void {
    this.triggerMetadata[tabla].next();
  }

  toggleJsonCompleto(tabla: EustatTableKey): void {
    this.mostrarJsonCompleto[tabla] = !this.mostrarJsonCompleto[tabla];
  }

  cargarCentros(): void {
    this.centrosTrigger$.next();
  }

  probarTablaZona(tabla: EustatTableKey, centro: CentroEducativo): void {
    this.triggerZona[tabla].next(centro);
  }

  jsonBonito(valor: any): string {
    return JSON.stringify(valor, null, 2);
  }


  // =====================================================
  // PETICIONES
  // =====================================================

  private pedirMetadata(tabla: EustatTableKey): Observable<EstadoMetadata> {
    return this.eustatService.getMetadata(tabla).pipe(
      map((datos) => {
        console.log(`METADATOS [${tabla}]:`, datos);

        const variables: ResumenVariable[] = (datos?.variables ?? []).map((variable: any) => {
          const valores: string[] = variable.values ?? [];
          const textos: string[] = variable.valueTexts ?? [];

          return {
            code: variable.code,
            numValores: valores.length,
            primerosValores: valores.slice(0, 5).join(', '),
            primerosTextos: textos.slice(0, 5).join(', '),
          };
        });

        return { cargando: false, error: '', datos, variables } as EstadoMetadata;
      }),
      startWith({ ...this.estadoMetadataVacio(), cargando: true }),
      catchError((error) => {
        console.error(`ERROR METADATOS [${tabla}]:`, error);

        return of({
          cargando: false,
          error: `${error?.status ?? ''} ${error?.statusText ?? error?.message ?? 'Error desconocido'}`.trim(),
          datos: null,
          variables: [],
        } as EstadoMetadata);
      }),
    );
  }

  private pedirCentros(): Observable<EstadoCentros> {
    return this.centrosService.getCentros().pipe(
      map((centros) => {
        const primeros20 = centros.slice(0, 20);
        console.log('CENTROS (primeros 20):', primeros20);
        return { cargando: false, error: '', centros: primeros20 } as EstadoCentros;
      }),
      startWith({ ...this.estadoCentrosVacio(), cargando: true }),
      catchError((error) => {
        console.error('ERROR CENTROS:', error);

        return of({
          cargando: false,
          error: error?.message ?? 'Error desconocido',
          centros: [],
        } as EstadoCentros);
      }),
    );
  }

  /**
   * Pide primero los metadatos de la tabla (para saber qué variables
   * tiene realmente) y con eso construye la query: la variable
   * geográfica se fija al municipio del centro, y TODAS las demás se
   * piden con 'ALL' -- así no hace falta conocer de antemano los
   * códigos de valor de "nivel de instrucción", "tipo de renta", etc.
   */
  private pedirTablaZona(tabla: EustatTableKey, centro: CentroEducativo): Observable<EstadoConsultaZona> {
    return this.eustatService.getMetadata(tabla).pipe(
      switchMap((metadata) => {
        const filtros: EustatFiltro[] = (metadata?.variables ?? []).map((variable: any) => {
          if (variable.code === VARIABLE_MUNICIPIO) {
            return { code: variable.code, values: [centro.municipioCodigo] };
          }
          return { code: variable.code, values: 'ALL' };
        });

        return this.eustatService.getData(tabla, filtros);
      }),
      map((respuesta) => {
        console.log(`${ETIQUETA_TABLA[tabla].toUpperCase()} [${centro.nombre} / ${centro.municipioCodigo}]:`, respuesta);
        return { cargando: false, error: '', resultado: respuesta, centro } as EstadoConsultaZona;
      }),
      startWith({ cargando: true, error: '', resultado: null, centro } as EstadoConsultaZona),
      catchError((error) => {
        console.error(`ERROR ${ETIQUETA_TABLA[tabla].toUpperCase()} [${centro.nombre} / ${centro.municipioCodigo}]:`, error);

        return of({
          cargando: false,
          error: `${error?.status ?? ''} ${error?.statusText ?? error?.message ?? 'Error desconocido'}`.trim(),
          resultado: null,
          centro,
        } as EstadoConsultaZona);
      }),
    );
  }


  // =====================================================
  // ESTADOS INICIALES
  // =====================================================

  private estadoMetadataVacio(): EstadoMetadata {
    return { cargando: false, error: '', datos: null, variables: [] };
  }

  private estadoCentrosVacio(): EstadoCentros {
    return { cargando: false, error: '', centros: [] };
  }

  private estadoZonaVacio(): EstadoConsultaZona {
    return { cargando: false, error: '', resultado: null, centro: null };
  }
}