import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IdiomaInterfazService, IdiomaInterfaz } from '../../../core/services/idioma-interfaz.service';

/**
 * Botón "ES / EUS" para cambiar el idioma de la interfaz. Pensado para
 * vivir en slot="end" de un <ion-toolbar>, en cualquier página que lo
 * necesite -- hoy Home y Lectura, ver IdiomaInterfazService para por
 * qué esto es independiente del idioma del contenido.
 */
@Component({
  selector: 'app-selector-idioma',
  templateUrl: './selector-idioma.component.html',
  styleUrls: ['./selector-idioma.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class SelectorIdiomaComponent {

  idioma$ = this.idiomaInterfazService.idioma$;

  constructor(private idiomaInterfazService: IdiomaInterfazService) {}

  elegir(idioma: IdiomaInterfaz): void {
    this.idiomaInterfazService.cambiarIdioma(idioma);
  }
}