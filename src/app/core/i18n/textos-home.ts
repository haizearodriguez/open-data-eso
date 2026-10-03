import { IdiomaInterfaz } from '../services/idioma-interfaz.service';
import { Materia } from '../services/historial.service';

/**
 * Textos de la interfaz de Home en los dos idiomas. Por diseño, esto
 * NO depende del modelo lingüístico del alumno (ver
 * IdiomaInterfazService) -- es puramente el idioma que ha elegido con
 * el selector ES/EUS de la cabecera.
 */
export function textoHome(idioma: IdiomaInterfaz) {
  if (idioma === 'eu') {
    return {
      tituloPagina: 'Hasiera',
      sinPerfilTitulo: 'Oraindik ez duzu profilik',
      sinPerfilTexto: 'Hasi aurretik, sortu zure profila.',
      crearPerfil: 'Sortu nire profila',
      saludo: 'Kaixo',
      proximamente: 'Laster',
      materias: {
        lectura: 'Irakurmena',
        matematicas: 'Matematika',
        ciencias: 'Zientziak',
      } as Record<Materia, string>,
      sinEjercicios: 'Oraindik ez duzu ariketarik egin -- hasi orain!',
      conEjercicios: (num: number, pct: number) =>
        `${num} ariketa${num === 1 ? '' : 'k'} · asmatze-tasa: %${pct}`,
    };
  }

  return {
    tituloPagina: 'Inicio',
    sinPerfilTitulo: 'Todavía no tienes perfil',
    sinPerfilTexto: 'Necesitas crear tu perfil antes de empezar.',
    crearPerfil: 'Crear mi perfil',
    saludo: 'Hola',
    proximamente: 'Próximamente',
    materias: {
      lectura: 'Comprensión lectora',
      matematicas: 'Matemáticas',
      ciencias: 'Ciencias',
    } as Record<Materia, string>,
    sinEjercicios: 'Todavía no has hecho ningún ejercicio -- ¡empieza ya!',
    conEjercicios: (num: number, pct: number) =>
      `${num} ejercicio${num === 1 ? '' : 's'} · ${pct}% de aciertos`,
  };
}