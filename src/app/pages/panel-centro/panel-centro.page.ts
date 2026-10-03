import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, switchMap, catchError, of } from 'rxjs';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonSpinner,
  IonItem, IonLabel, IonInput, IonList,
} from '@ionic/angular';

import { PanelCentroService, ResumenGrupo } from '../../core/services/panel-centro.service';

type Paso = 'cargando-sesion' | 'login' | 'cargando-datos' | 'panel' | 'error';

interface EstadoPanel {
  paso: Paso;
  error: string;
  resumen: ResumenGrupo[];
}

const ETIQUETA_MATERIA: Record<string, string> = {
  lectura: 'Comprensión lectora',
  matematicas: 'Matemáticas',
  ciencias: 'Ciencias',
};

/**
 * Dashboard privado para personal de centro / Educación -- a
 * diferencia de todo lo demás en la app, aquí hay autenticación real
 * (Supabase Auth, email+contraseña), porque lo que se lee son datos
 * agregados de alumnado ajeno, no el propio perfil de quien entra.
 *
 * Nunca muestra una fila por alumno: obtener_resumen_centro() en
 * Supabase ya devuelve solo medias por centro/curso/grupo/materia, y
 * solo de los centros a los que esta persona tiene acceso -- ver
 * supabase-schema.sql.
 */
@Component({
  selector: 'app-panel-centro',
  templateUrl: './panel-centro.page.html',
  styleUrls: ['./panel-centro.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonSpinner,
    IonItem, IonLabel, IonInput, IonList,
  ],
})
export class PanelCentroPage {

  private estadoSubject = new BehaviorSubject<EstadoPanel>({
    paso: 'cargando-sesion',
    error: '',
    resumen: [],
  });
  estado$ = this.estadoSubject.asObservable();

  email = '';
  password = '';

  etiquetaMateria = ETIQUETA_MATERIA;

  constructor(private panelCentroService: PanelCentroService) {
    this.panelCentroService.obtenerSesionActual().subscribe({
      next: (sesion) => {
        if (sesion) {
          this.cargarResumen();
        } else {
          this.estadoSubject.next({ paso: 'login', error: '', resumen: [] });
        }
      },
      error: () => {
        this.estadoSubject.next({ paso: 'login', error: '', resumen: [] });
      },
    });
  }

  get loginValido(): boolean {
    return !!this.email.trim() && !!this.password;
  }

  entrar(): void {
    if (!this.loginValido) {
      return;
    }

    this.estadoSubject.next({ paso: 'cargando-datos', error: '', resumen: [] });

    this.panelCentroService.iniciarSesion(this.email.trim(), this.password).pipe(
      switchMap(() => this.panelCentroService.obtenerResumen()),
      catchError((error) => {
        console.error('Error iniciando sesión en el panel de centro:', error);
        this.estadoSubject.next({
          paso: 'login',
          error: 'Email o contraseña incorrectos.',
          resumen: [],
        });
        return of(null);
      }),
    ).subscribe((resumen) => {
      if (resumen === null) {
        return;
      }
      this.password = '';
      this.estadoSubject.next({ paso: 'panel', error: '', resumen });
    });
  }

  private cargarResumen(): void {
    this.estadoSubject.next({ paso: 'cargando-datos', error: '', resumen: [] });

    this.panelCentroService.obtenerResumen().subscribe({
      next: (resumen) => {
        this.estadoSubject.next({ paso: 'panel', error: '', resumen });
      },
      error: (error) => {
        console.error('Error cargando el resumen de centro:', error);
        this.estadoSubject.next({
          paso: 'error',
          error: 'No se ha podido cargar el resumen. Inténtalo de nuevo.',
          resumen: [],
        });
      },
    });
  }

  reintentar(): void {
    this.cargarResumen();
  }

  salir(): void {
    this.panelCentroService.cerrarSesion().subscribe(() => {
      this.email = '';
      this.password = '';
      this.estadoSubject.next({ paso: 'login', error: '', resumen: [] });
    });
  }
}