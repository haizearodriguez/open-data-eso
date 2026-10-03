import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonBadge,
} from '@ionic/angular';

import { PerfilService } from '../../core/services/perfil.service';
import { HistorialService, ResumenMateria, Materia } from '../../core/services/historial.service';
import { IdiomaInterfazService } from '../../core/services/idioma-interfaz.service';
import { textoHome } from '../../core/i18n/textos-home';
import { PerfilAlumno } from '../../models/perfil.model';
import { SelectorIdiomaComponent } from '../../shared/components/selector-idioma/selector-idioma.component';

interface TarjetaMateria {
  materia: Materia;
  disponible: boolean;
  resumen: ResumenMateria | null; // null si la materia todavía no existe
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonBadge,
    SelectorIdiomaComponent,
  ],
})
export class HomePage {

  // Idioma de la INTERFAZ (selector ES/EUS de la cabecera) -- distinto
  // del idioma del CONTENIDO de cada materia, que sigue dependiendo
  // del modelo lingüístico del perfil. Ver IdiomaInterfazService.
  idioma$ = this.idiomaInterfazService.idioma$;
  protected readonly textoHome = textoHome;

  // Sin perfil: no hace falta un Observable/BehaviorSubject aquí --
  // todo lo que lee esta página (perfil e historial) es localStorage
  // síncrono, no una llamada HTTP que llegue fuera de un evento de
  // Angular. El único caso zoneless a vigilar sería una petición async,
  // que esta página no hace.
  perfil: PerfilAlumno | null;

  tarjetas: TarjetaMateria[] = [];

  constructor(
    private perfilService: PerfilService,
    private historialService: HistorialService,
    private idiomaInterfazService: IdiomaInterfazService,
    private router: Router,
  ) {
    this.perfil = this.perfilService.obtenerPerfilActual();

    if (this.perfil) {
      this.tarjetas = [
        { materia: 'lectura', disponible: true, resumen: this.historialService.obtenerResumen('lectura') },
        { materia: 'matematicas', disponible: true, resumen: this.historialService.obtenerResumen('matematicas') },
        { materia: 'ciencias', disponible: true, resumen: this.historialService.obtenerResumen('ciencias') },
      ];
    }
  }

  irAMateria(tarjeta: TarjetaMateria): void {
    if (!tarjeta.disponible) {
      return;
    }

    // La ruta coincide con el nombre de la materia en los tres casos
    // (ver app.routes.ts), así que no hace falta un switch aquí.
    this.router.navigateByUrl(`/${tarjeta.materia}`);
  }

  irAlOnboarding(): void {
    this.router.navigateByUrl('/onboarding');
  }
}