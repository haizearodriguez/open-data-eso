import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type IdiomaInterfaz = 'es' | 'eu';

const CLAVE_STORAGE = 'ilbe_idioma_interfaz';

/**
 * Idioma de LA INTERFAZ (botones, títulos, mensajes) -- NO confundir
 * con el idioma del CONTENIDO (textos de lectura, enunciados de
 * ejercicios), que sigue decidiéndolo el modelo lingüístico del
 * perfil del alumno (ver PerfilAlumno.modeloLinguistico, usado en
 * lectura.page.ts / ejercicio-generado.page.ts para pedir los
 * ejercicios en es o eu). Son dos cosas independientes a propósito:
 * un alumno de modelo D puede perfectamente querer la interfaz en
 * castellano, o al revés.
 *
 * Se guarda en localStorage para que la elección persista entre
 * sesiones -- un BehaviorSubject (no una propiedad plana) porque el
 * selector puede vivir en varias páginas a la vez y todas deben
 * repintarse en cuanto cambie, incluida la que no disparó el cambio.
 */
@Injectable({
  providedIn: 'root',
})
export class IdiomaInterfazService {

  private idiomaSubject = new BehaviorSubject<IdiomaInterfaz>(this.leerGuardado());
  idioma$ = this.idiomaSubject.asObservable();

  private leerGuardado(): IdiomaInterfaz {
    const guardado = localStorage.getItem(CLAVE_STORAGE);
    return guardado === 'eu' ? 'eu' : 'es';
  }

  obtenerIdiomaActual(): IdiomaInterfaz {
    return this.idiomaSubject.value;
  }

  cambiarIdioma(idioma: IdiomaInterfaz): void {
    if (idioma === this.idiomaSubject.value) {
      return;
    }
    localStorage.setItem(CLAVE_STORAGE, idioma);
    this.idiomaSubject.next(idioma);
  }
}