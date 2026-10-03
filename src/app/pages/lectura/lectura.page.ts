import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BehaviorSubject, switchMap, map, throwError } from 'rxjs';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonSpinner,
  IonRadioGroup, IonRadio, IonItem, IonLabel, IonList, IonIcon,
  AlertController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, chevronBackOutline, chevronForwardOutline, addOutline, removeOutline } from 'ionicons/icons';

import { TextosService } from '../../core/services/textos.service';
import { PerfilService } from '../../core/services/perfil.service';
import { HistorialService } from '../../core/services/historial.service';
import { IdiomaInterfazService } from '../../core/services/idioma-interfaz.service';
import { textoLectura } from '../../core/i18n/textos-lectura';
import { elegirTextoInicial } from '../../core/utils/seleccion-texto';
import { TextoLectura, PreguntaComprension } from '../../models/texto-lectura.model';
import { PerfilAlumno } from '../../models/perfil.model';
import { SelectorIdiomaComponent } from '../../shared/components/selector-idioma/selector-idioma.component';

const NUM_PREGUNTAS = 4;
const FUENTE_MIN = 15;
const FUENTE_MAX = 26;
const FUENTE_PASO = 2;

type PasoLectura = 'sin-perfil' | 'cargando' | 'leyendo' | 'respondiendo' | 'corregido' | 'error';

// Clave del mensaje de tono de la corrección (ver textos-lectura.ts,
// clave `mensaje`) en vez del texto ya resuelto -- así el mismo
// resultado se puede repintar en el idioma de interfaz que sea, sin
// tener que volver a calcular nada al cambiar de idioma.
type TonoResultado = 'perfecto' | 'muyBien' | 'progresando' | 'repasar' | '';

interface EstadoLectura {
  paso: PasoLectura;
  error: string;
  texto: TextoLectura | null;
  preguntas: PreguntaComprension[];
  respuestas: (number | null)[];
  indicePregunta: number;
  aciertos: number;
  tono: TonoResultado;
}

function estadoInicial(paso: PasoLectura = 'cargando'): EstadoLectura {
  return {
    paso, error: '', texto: null, preguntas: [], respuestas: [],
    indicePregunta: 0, aciertos: 0, tono: '',
  };
}

/**
 * Tono de la corrección según el resultado -- sustituye el antiguo
 * "3/4 correctas" seco. Nunca negativo del todo: aunque falle más de
 * la mitad, invita a repasar, no a desanimarse. Devuelve una CLAVE,
 * no el texto ya traducido -- ver TonoResultado arriba.
 */
function tonoSegunResultado(aciertos: number, total: number): TonoResultado {
  if (total === 0) {
    return '';
  }
  const ratio = aciertos / total;
  if (ratio === 1) {
    return 'perfecto';
  }
  if (ratio >= 0.75) {
    return 'muyBien';
  }
  if (ratio >= 0.5) {
    return 'progresando';
  }
  return 'repasar';
}

@Component({
  selector: 'app-lectura',
  templateUrl: './lectura.page.html',
  styleUrls: ['./lectura.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonSpinner,
    IonRadioGroup, IonRadio, IonItem, IonLabel, IonList, IonIcon,
    SelectorIdiomaComponent,
  ],
})
export class LecturaPage {

  private estadoSubject = new BehaviorSubject<EstadoLectura>(estadoInicial());
  estado$ = this.estadoSubject.asObservable();

  // Idioma de la interfaz (selector ES/EUS) -- independiente del
  // idioma del texto que se está leyendo, ver IdiomaInterfazService.
  idioma$ = this.idiomaInterfazService.idioma$;
  protected readonly textoLectura = textoLectura;

  // Tamaño de letra de la pantalla de lectura. Propiedad plana (no en
  // el BehaviorSubject): solo cambia dentro de clicks síncronos de
  // A+/A-, así que no hace falta pasarla por rxjs para que la vista
  // zoneless la recoja.
  tamanoFuente = 18;

  private perfil: PerfilAlumno | null;

  constructor(
    private textosService: TextosService,
    private perfilService: PerfilService,
    private historialService: HistorialService,
    private idiomaInterfazService: IdiomaInterfazService,
    private router: Router,
    private alertController: AlertController,
  ) {
    addIcons({ closeOutline, chevronBackOutline, chevronForwardOutline, addOutline, removeOutline });

    this.perfil = this.perfilService.obtenerPerfilActual();

    if (!this.perfil) {
      this.estadoSubject.next(estadoInicial('sin-perfil'));
      return;
    }

    this.cargarLectura();
  }

  private cargarLectura(): void {
    const perfil = this.perfil;
    if (!perfil) {
      return;
    }

    this.estadoSubject.next(estadoInicial('cargando'));

    this.textosService.getTextos().pipe(
      map((textos) => elegirTextoInicial(textos, perfil)),
      switchMap((texto) => {
        if (!texto) {
          return throwError(() => new Error('No hay textos disponibles todavía para tu perfil.'));
        }

        return this.textosService.generarPreguntas(texto, NUM_PREGUNTAS).pipe(
          map((preguntas) => ({ texto, preguntas })),
        );
      }),
    ).subscribe({
      next: ({ texto, preguntas }) => {
        this.estadoSubject.next({
          ...estadoInicial('leyendo'),
          texto,
          preguntas,
          respuestas: new Array(preguntas.length).fill(null),
        });
      },
      error: (error) => {
        console.error('Error cargando la lectura:', error);
        this.estadoSubject.next({
          ...estadoInicial('error'),
          error: error?.message ?? 'No se ha podido cargar el ejercicio. Inténtalo de nuevo.',
        });
      },
    });
  }

  aumentarFuente(): void {
    this.tamanoFuente = Math.min(FUENTE_MAX, this.tamanoFuente + FUENTE_PASO);
  }

  disminuirFuente(): void {
    this.tamanoFuente = Math.max(FUENTE_MIN, this.tamanoFuente - FUENTE_PASO);
  }

  empezarPreguntas(): void {
    const actual = this.estadoSubject.value;
    if (actual.paso !== 'leyendo') {
      return;
    }

    this.estadoSubject.next({ ...actual, paso: 'respondiendo', indicePregunta: 0 });
  }

  volverAlTexto(): void {
    const actual = this.estadoSubject.value;
    if (actual.paso !== 'respondiendo') {
      return;
    }

    this.estadoSubject.next({ ...actual, paso: 'leyendo' });
  }

  seleccionarRespuesta(indicePregunta: number, indiceOpcion: number): void {
    const actual = this.estadoSubject.value;
    if (actual.paso !== 'respondiendo') {
      return;
    }

    const respuestas = [...actual.respuestas];
    respuestas[indicePregunta] = indiceOpcion;

    this.estadoSubject.next({ ...actual, respuestas });
  }

  siguientePregunta(): void {
    const actual = this.estadoSubject.value;
    if (actual.paso !== 'respondiendo') {
      return;
    }
    if (actual.respuestas[actual.indicePregunta] === null) {
      return;
    }

    const siguiente = Math.min(actual.preguntas.length - 1, actual.indicePregunta + 1);
    this.estadoSubject.next({ ...actual, indicePregunta: siguiente });
  }

  anteriorPregunta(): void {
    const actual = this.estadoSubject.value;
    if (actual.paso !== 'respondiendo') {
      return;
    }

    const anterior = Math.max(0, actual.indicePregunta - 1);
    this.estadoSubject.next({ ...actual, indicePregunta: anterior });
  }

  esUltimaPregunta(estado: EstadoLectura): boolean {
    return estado.indicePregunta === estado.preguntas.length - 1;
  }

  todasContestadas(estado: EstadoLectura): boolean {
    return estado.respuestas.length > 0 && estado.respuestas.every((r) => r !== null);
  }

  corregir(): void {
    const actual = this.estadoSubject.value;
    if (actual.paso !== 'respondiendo' || !this.todasContestadas(actual) || !actual.texto) {
      return;
    }

    const aciertos = actual.preguntas.reduce(
      (acc, pregunta, i) => acc + (actual.respuestas[i] === pregunta.respuestaCorrecta ? 1 : 0),
      0,
    );

    try {
      this.historialService.guardarResultado({
        materia: 'lectura',
        perfilCodigo: this.perfil!.codigo,
        refId: actual.texto.id,
        titulo: actual.texto.titulo,
        aciertos,
        total: actual.preguntas.length,
        fecha: new Date().toISOString(),
      });
    } catch (error) {
      console.error('No se ha podido guardar el resultado en el historial:', error);
    }

    this.estadoSubject.next({
      ...actual,
      paso: 'corregido',
      aciertos,
      tono: tonoSegunResultado(aciertos, actual.preguntas.length),
    });
  }

  otroTexto(): void {
    this.cargarLectura();
  }

  reintentar(): void {
    this.cargarLectura();
  }

  async salir(): Promise<void> {
    const actual = this.estadoSubject.value;
    if (actual.paso !== 'respondiendo' && actual.paso !== 'leyendo') {
      this.irAHome();
      return;
    }

    const t = textoLectura(this.idiomaInterfazService.obtenerIdiomaActual());

    const alert = await this.alertController.create({
      header: t.salirTitulo,
      message: t.salirMensaje,
      buttons: [
        { text: t.salirCancelar, role: 'cancel' },
        { text: t.salirConfirmar, role: 'destructive', handler: () => this.irAHome() },
      ],
    });

    await alert.present();
  }

  irAlOnboarding(): void {
    this.router.navigateByUrl('/onboarding');
  }

  irAHome(): void {
    this.router.navigateByUrl('/home');
  }
}