import { IdiomaInterfaz } from '../services/idioma-interfaz.service';

/**
 * Textos de la interfaz de la página de Lectura (botones, títulos,
 * mensajes de estado) en los dos idiomas. Independiente del idioma
 * DEL TEXTO que se está leyendo -- ese lo decide el modelo lingüístico
 * del perfil (badge "Euskera"/"Castellano" dentro del propio texto,
 * que no toca este diccionario). Ver IdiomaInterfazService.
 */
export function textoLectura(idioma: IdiomaInterfaz) {
  if (idioma === 'eu') {
    return {
      tituloPagina: 'Irakurmena',
      sinPerfilTitulo: 'Oraindik ez duzu profilik',
      sinPerfilTexto: 'Irakurtzen hasi aurretik, sortu zure profila.',
      crearPerfil: 'Sortu nire profila',
      cargando: 'Zure irakurgaia prestatzen...',
      errorGenerico: 'Ezin izan da ariketa kargatu. Saiatu berriro.',
      reintentar: 'Saiatu berriro',
      terminarLeer: 'Irakurri dut -- ikusi galderak',
      volverTexto: 'Testura itzuli',
      preguntaDe: (actual: number, total: number) => `${actual}. galdera, ${total}etik`,
      anterior: 'Aurrekoa',
      siguiente: 'Hurrengoa',
      corregir: 'Zuzendu',
      correctas: (aciertos: number, total: number) => `${aciertos}/${total} zuzen`,
      tuRespuesta: 'Zure erantzuna:',
      correctaEs: 'Zuzena:',
      siguienteLectura: 'Hurrengo irakurgaia',
      volverInicio: 'Hasierara itzuli',
      salirTitulo: 'Ariketatik irten?',
      salirMensaje: 'Saiakera hau galduko duzu eta ez da emaitzarik gordeko.',
      salirCancelar: 'Jarraitu hemen',
      salirConfirmar: 'Irten',
      mensaje: {
        perfecto: 'Bikain! Testua oso ondo ulertu duzu.',
        muyBien: 'Oso ondo! Testuaren ia dena menperatzen duzu.',
        progresando: 'Aurrera zoaz. Errepasatu huts egindakoak.',
        repasar: 'Errepasa dezagun -- begiratu galdera bakoitzaren azalpena.',
      },
    };
  }

  return {
    tituloPagina: 'Comprensión lectora',
    sinPerfilTitulo: 'Todavía no tienes perfil',
    sinPerfilTexto: 'Necesitas crear tu perfil antes de empezar a leer.',
    crearPerfil: 'Crear mi perfil',
    cargando: 'Preparando tu lectura...',
    errorGenerico: 'No se ha podido cargar el ejercicio. Inténtalo de nuevo.',
    reintentar: 'Reintentar',
    terminarLeer: 'He terminado de leer -- ver preguntas',
    volverTexto: 'Volver a leer el texto',
    preguntaDe: (actual: number, total: number) => `Pregunta ${actual} de ${total}`,
    anterior: 'Anterior',
    siguiente: 'Siguiente',
    corregir: 'Corregir',
    correctas: (aciertos: number, total: number) => `${aciertos} de ${total} correctas`,
    tuRespuesta: 'Tu respuesta:',
    correctaEs: 'Correcta:',
    siguienteLectura: 'Siguiente lectura',
    volverInicio: 'Volver al inicio',
    salirTitulo: '¿Salir del ejercicio?',
    salirMensaje: 'Perderás este intento y no se guardará ningún resultado.',
    salirCancelar: 'Seguir aquí',
    salirConfirmar: 'Salir',
    mensaje: {
      perfecto: '¡Perfecto! Has entendido muy bien el texto.',
      muyBien: '¡Muy bien! Dominas casi todo el texto.',
      progresando: 'Vas progresando. Repasa las que has fallado.',
      repasar: 'Repasemos esto juntos -- mira las explicaciones de cada pregunta.',
    },
  };
}