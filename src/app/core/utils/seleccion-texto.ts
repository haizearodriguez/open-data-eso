import { TextoLectura, NivelEso, Idioma } from '../../models/texto-lectura.model';
import { PerfilAlumno } from '../../models/perfil.model';

export function elegirTextoInicial(
  textos: TextoLectura[],
  perfil: PerfilAlumno,
): TextoLectura | null {
  if (textos.length === 0) {
    return null;
  }

  const idiomaDeseado: Idioma = perfil.modeloLinguistico === 'D' ? 'eu' : 'es';
  const nivelDeseado: NivelEso = `${perfil.curso}ESO` as NivelEso;

  const candidatosIdioma = textos.filter((t) => t.idioma === idiomaDeseado);
  const base = candidatosIdioma.length > 0 ? candidatosIdioma : textos;

  const conNivelExacto = base.filter((t) => t.nivel === nivelDeseado);
  const sinClasificar = base.filter((t) => t.nivel === null);

  const pool = conNivelExacto.length > 0
    ? conNivelExacto
    : sinClasificar.length > 0
      ? sinClasificar
      : base;

  const indice = Math.floor(Math.random() * pool.length);
  return pool[indice];
}