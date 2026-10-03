import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TextoLectura, PreguntaComprension } from '../../models/texto-lectura.model';

@Injectable({
  providedIn: 'root',
})
export class TextosService {
  private readonly apiBase = `${environment.eustatProxyUrl}/api`;

  private textosCache$?: Observable<TextoLectura[]>;

  constructor(private http: HttpClient) {}

  getTextos(): Observable<TextoLectura[]> {
    if (!this.textosCache$) {
      this.textosCache$ = this.http
        .get<TextoLectura[]>(`${this.apiBase}/textos`)
        .pipe(shareReplay(1));
    }

    return this.textosCache$;
  }

  generarPreguntas(texto: TextoLectura, numPreguntas = 4): Observable<PreguntaComprension[]> {
    return this.http.post<PreguntaComprension[]>(`${this.apiBase}/generar-preguntas`, {
      texto: texto.texto,
      idioma: texto.idioma,
      numPreguntas,
    });
  }
}