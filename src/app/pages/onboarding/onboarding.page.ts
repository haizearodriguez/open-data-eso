import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel,
  IonSearchbar, IonList, IonSelect, IonSelectOption, IonButton, IonSpinner, IonIcon,
  IonInput,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { copyOutline, checkmarkOutline } from 'ionicons/icons';

import { CentrosService } from '../../core/services/centros.service';
import { PerfilService } from '../../core/services/perfil.service';
import { CentroEducativo } from '../../models/centro.model';
import { CursoEso, ModeloLinguistico, PerfilAlumno } from '../../models/perfil.model';

type Paso = 'inicio' | 'formulario' | 'calculando' | 'bienvenida' | 'codigo' | 'recuperar' | 'recuperando';

// De dónde viene el perfil que se muestra en 'bienvenida': decide si
// hace falta pasar por la pantalla de "guarda tu código" (nuevo) o no
// (recuperado -- el alumno ya conoce su código, es el que ha escrito).
type OrigenPerfil = 'nuevo' | 'recuperado';

interface EstadoOnboarding {
  paso: Paso;
  error: string;
  perfilCreado: PerfilAlumno | null;
  origenPerfil: OrigenPerfil;
}

@Component({
  selector: 'app-onboarding',
  templateUrl: 'onboarding.page.html',
  styleUrls: ['onboarding.page.scss'],
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel,
    IonSearchbar, IonList, IonSelect, IonSelectOption, IonButton, IonSpinner, IonIcon,
    IonInput,
  ],
})
export class OnboardingPage {

  // --- Estado de la petición async: SIEMPRE vía BehaviorSubject +
  // async pipe en la plantilla. Necesario en zoneless: si esto fuera
  // una propiedad normal actualizada dentro de un subscribe(), la
  // vista no se repintaría al llegar la respuesta de EUSTAT.
  private estadoSubject = new BehaviorSubject<EstadoOnboarding>({
    paso: 'inicio',
    error: '',
    perfilCreado: null,
    origenPerfil: 'nuevo',
  });
  estado$ = this.estadoSubject.asObservable();

  // Confirmación de "copiado" tras pulsar el botón de copiar código --
  // el setTimeout que la apaga llega fuera de un evento de plantilla,
  // así que va por BehaviorSubject igual que el resto del estado async
  // (una propiedad normal no repintaría cuando ese timeout dispara).
  private copiadoSubject = new BehaviorSubject<boolean>(false);
  copiado$ = this.copiadoSubject.asObservable();

  // --- Campos del formulario: propiedades normales. Se leen/escriben
  // siempre desde eventos de plantilla síncronos (click, input), así
  // que en zoneless funcionan bien sin necesidad de Observable.
  resultadosCentro: CentroEducativo[] = [];
  centroSeleccionado?: CentroEducativo;

  cursos: { valor: CursoEso; etiqueta: string }[] = [
    { valor: '1', etiqueta: '1º ESO' },
    { valor: '2', etiqueta: '2º ESO' },
    { valor: '3', etiqueta: '3º ESO' },
    { valor: '4', etiqueta: '4º ESO' },
  ];

  // Placeholder: no hay fuente de datos de cuántos grupos tiene cada
  // centro/curso -- lista fija A-E por ahora.
  grupos = ['A', 'B', 'C', 'D', 'E'];

  modelos: ModeloLinguistico[] = ['A', 'B', 'D'];

  curso?: CursoEso;
  grupo?: string;
  modeloLinguistico?: ModeloLinguistico;

  // Campo del formulario de "recuperar perfil con un código" -- misma
  // lógica que el resto de campos: propiedad normal, se lee/escribe
  // desde eventos síncronos de plantilla.
  codigoRecuperar = '';

  constructor(
    private centrosService: CentrosService,
    private perfilService: PerfilService,
    private router: Router,
  ) {
    addIcons({ copyOutline, checkmarkOutline });

    // Cargamos el directorio una vez al entrar, para poder usar
    // buscarCentros() de forma síncrona mientras el usuario escribe.
    this.centrosService.getCentros().subscribe({
      error: (error) => console.error('Error cargando centros:', error),
    });
  }

  get formularioValido(): boolean {
    return !!(
      this.centroSeleccionado &&
      this.curso &&
      this.grupo &&
      this.modeloLinguistico
    );
  }

  buscarCentro(event: any): void {
    const texto = event.target.value || '';

    if (texto.length < 3) {
      this.resultadosCentro = [];
      return;
    }

    this.resultadosCentro = this.centrosService.buscarCentros(texto).slice(0, 20);
  }

  seleccionarCentro(centro: CentroEducativo): void {
    this.centroSeleccionado = centro;
    this.resultadosCentro = [];
  }

  seleccionarModelo(modelo: ModeloLinguistico): void {
    this.modeloLinguistico = modelo;
  }

  crearPerfil(): void {
    if (
      !this.formularioValido ||
      !this.centroSeleccionado ||
      !this.curso ||
      !this.grupo ||
      !this.modeloLinguistico
    ) {
      return;
    }

    this.estadoSubject.next({ paso: 'calculando', error: '', perfilCreado: null, origenPerfil: 'nuevo' });

    this.perfilService.crearPerfil({
      centroId: this.centroSeleccionado.id,
      centroNombre: this.centroSeleccionado.nombre,
      municipioCodigo: this.centroSeleccionado.municipioCodigo,
      curso: this.curso,
      grupo: this.grupo,
      modeloLinguistico: this.modeloLinguistico,
    }).subscribe({

      next: (perfil) => {
        this.estadoSubject.next({ paso: 'bienvenida', error: '', perfilCreado: perfil, origenPerfil: 'nuevo' });
      },

      error: (error) => {
        console.error('Error creando el perfil (calibración EUSTAT):', error);
        this.estadoSubject.next({
          paso: 'formulario',
          error: 'No se ha podido calcular tu perfil. Inténtalo de nuevo.',
          perfilCreado: null,
          origenPerfil: 'nuevo',
        });
      },
    });
  }

  irAFormulario(): void {
    const actual = this.estadoSubject.value;
    this.estadoSubject.next({ ...actual, paso: 'formulario', error: '' });
  }

  irARecuperar(): void {
    const actual = this.estadoSubject.value;
    this.estadoSubject.next({ ...actual, paso: 'recuperar', error: '' });
  }

  volverAInicio(): void {
    this.codigoRecuperar = '';
    this.estadoSubject.next({ paso: 'inicio', error: '', perfilCreado: null, origenPerfil: 'nuevo' });
  }

  recuperarPerfil(): void {
    const codigo = this.codigoRecuperar.trim();
    if (!codigo) {
      return;
    }

    this.estadoSubject.next({ paso: 'recuperando', error: '', perfilCreado: null, origenPerfil: 'recuperado' });

    this.perfilService.recuperarPerfilPorCodigo(codigo).subscribe({

      next: (perfil) => {
        if (!perfil) {
          this.estadoSubject.next({
            paso: 'recuperar',
            error: 'No hemos encontrado ningún perfil con ese código. Revísalo e inténtalo de nuevo.',
            perfilCreado: null,
            origenPerfil: 'recuperado',
          });
          return;
        }

        this.estadoSubject.next({ paso: 'bienvenida', error: '', perfilCreado: perfil, origenPerfil: 'recuperado' });
      },

      error: (error) => {
        console.error('Error recuperando el perfil:', error);
        this.estadoSubject.next({
          paso: 'recuperar',
          error: 'No se ha podido comprobar el código. Inténtalo de nuevo.',
          perfilCreado: null,
          origenPerfil: 'recuperado',
        });
      },
    });
  }

  empezar(): void {
    const actual = this.estadoSubject.value;

    // Un perfil recuperado ya tiene código conocido por el alumno --
    // no hace falta volver a mostrárselo, directos a la app.
    if (actual.origenPerfil === 'recuperado') {
      this.continuar();
      return;
    }

    this.estadoSubject.next({ ...actual, paso: 'codigo' });
  }

  async copiarCodigo(codigo: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(codigo);
    } catch (error) {
      console.error('No se ha podido copiar el código:', error);
      return;
    }

    this.copiadoSubject.next(true);
    setTimeout(() => this.copiadoSubject.next(false), 2000);
  }

  continuar(): void {
    this.router.navigateByUrl('/home');
  }

  // El saludo antes era euskera fijo, sin relación con el modelo
  // lingüístico que el propio alumno acaba de elegir en el formulario.
  saludo(modelo: ModeloLinguistico | undefined): string {
    return modelo === 'D' ? 'Ongi etorri!' : '¡Bienvenido/a!';
  }
}