import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonSpinner,
  IonRadioGroup, IonRadio, IonItem, IonLabel, IonList, IonIcon,
  AlertController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

import { EjerciciosGeneradosService, MateriaGenerada } from '../../core/services/ejercicios-generados.service';
import { PerfilService } from '../../core/services/perfil.service';
import { HistorialService } from '../../core/services/historial.service';
import { PreguntaGenerada } from '../../models/ejercicio-generado.model';
import { PerfilAlumno } from '../../models/perfil.model';
import { Idioma } from '../../models/texto-lectura.model';

const NUM_PREGUNTAS = 4;

type Paso = 'sin-perfil' | 'cargando' | 'respondiendo' | 'corregido' | 'error';

interface Estado {
  paso: Paso;
  error: string;
  preguntas: PreguntaGenerada[];
  respuestas: (number | null)[];
  indicePregunta: number;
  aciertos: number;
  mensaje: string;
}

function estadoInicial(paso: Paso = 'cargando'): Estado {
  return {
    paso, error: '', preguntas: [], respuestas: [],
    indicePregunta: 0, aciertos: 0, mensaje: '',
  };
}

/**
 * Mismo criterio de tono que en Lectura (ver lectura.page.ts) --
 * nunca un mensaje puramente negativo, siempre invita a seguir.
 */
function mensajeSegunResultado(aciertos: number, total: number): string {
  if (total === 0) {
    return '';
  }
  const ratio = aciertos / total;
  if (ratio === 1) {
    return '¡Perfecto! Los dominas todos.';
  }
  if (ratio >= 0.75) {
    return '¡Muy bien! Casi todos correctos.';
  }
  if (ratio >= 0.5) {
    return 'Vas progresando. Repasa las explicaciones.';
  }
  return 'Repasemos esto juntos -- mira las explicaciones de cada ejercicio.';
}

/**
 * Página genérica para materias cuyos ejercicios genera Gemini de
 * cero (sin banco de textos detrás, a diferencia de LecturaPage).
 * Sirve tanto para Matemáticas como para Ciencias -- qué materia es
 * en cada caso viene de `data` en app.routes.ts, no de dos
 * componentes casi idénticos por separado.
 */
@Component({
  selector: 'app-ejercicio-generado',
  templateUrl: './ejercicio-generado.page.html',
  styleUrls: ['./ejercicio-generado.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonSpinner,
    IonRadioGroup, IonRadio, IonItem, IonLabel, IonList, IonIcon,
  ],
})
export class EjercicioGeneradoPage {

  private estadoSubject = new BehaviorSubject<Estado>(estadoInicial());
  estado$ = this.estadoSubject.asObservable();

  materia: MateriaGenerada;
  titulo: string;

  private perfil: PerfilAlumno | null;

  constructor(
    private route: ActivatedRoute,
    private ejerciciosService: EjerciciosGeneradosService,
    private perfilService: PerfilService,
    private historialService: HistorialService,
    private router: Router,
    private alertController: AlertController,
  ) {
    addIcons({ closeOutline, chevronBackOutline, chevronForwardOutline });

    this.materia = this.route.snapshot.data['materia'];
    this.titulo = this.route.snapshot.data['titulo'];

    this.perfil = this.perfilService.obtenerPerfilActual();

    if (!this.perfil) {
      this.estadoSubject.next(estadoInicial('sin-perfil'));
      return;
    }

    this.cargarEjercicios();
  }

  private cargarEjercicios(): void {
    const perfil = this.perfil;
    if (!perfil) {
      return;
    }

    this.estadoSubject.next(estadoInicial('cargando'));

    // Mismo criterio de idioma que en lectura: D -> euskera, A/B -> castellano.
    const idioma: Idioma = perfil.modeloLinguistico === 'D' ? 'eu' : 'es';

    this.ejerciciosService.generarEjercicios(this.materia, perfil.curso, idioma, NUM_PREGUNTAS).subscribe({
      next: (preguntas) => {
        this.estadoSubject.next({
          ...estadoInicial('respondiendo'),
          preguntas,
          respuestas: new Array(preguntas.length).fill(null),
        });
      },
      error: (error) => {
        console.error(`Error generando ejercicios de ${this.materia}:`, error);
        this.estadoSubject.next({
          ...estadoInicial('error'),
          error: 'No se han podido generar los ejercicios. Inténtalo de nuevo.',
        });
      },
    });
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

  esUltimaPregunta(estado: Estado): boolean {
    return estado.indicePregunta === estado.preguntas.length - 1;
  }

  todasContestadas(estado: Estado): boolean {
    return estado.respuestas.length > 0 && estado.respuestas.every((r) => r !== null);
  }

  corregir(): void {
    const actual = this.estadoSubject.value;
    if (actual.paso !== 'respondiendo' || !this.todasContestadas(actual)) {
      return;
    }

    const aciertos = actual.preguntas.reduce(
      (acc, pregunta, i) => acc + (actual.respuestas[i] === pregunta.respuestaCorrecta ? 1 : 0),
      0,
    );

    try {
      this.historialService.guardarResultado({
        materia: this.materia,
        perfilCodigo: this.perfil!.codigo,
        refId: `${this.materia}-${Date.now()}`, // no hay un id de banco -- se genera al vuelo
        titulo: this.titulo,
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
      mensaje: mensajeSegunResultado(aciertos, actual.preguntas.length),
    });
  }

  otraTanda(): void {
    this.cargarEjercicios();
  }

  reintentar(): void {
    this.cargarEjercicios();
  }

  async salir(): Promise<void> {
    const actual = this.estadoSubject.value;
    if (actual.paso !== 'respondiendo') {
      this.irAHome();
      return;
    }

    const alert = await this.alertController.create({
      header: '¿Salir del ejercicio?',
      message: 'Perderás este intento y no se guardará ningún resultado.',
      buttons: [
        { text: 'Seguir aquí', role: 'cancel' },
        { text: 'Salir', role: 'destructive', handler: () => this.irAHome() },
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