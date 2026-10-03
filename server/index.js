// server/index.js
//
// Proxy minimo para las consultas POST a EUSTAT, servidor del banco de
// textos de lectura, y generador de preguntas de comprension con IA.
//
// Por que existe el proxy EUSTAT: el navegador bloquea el POST directo
// a EUSTAT por CORS (confirmado con Postman: el mismo payload exacto
// funciona fuera del navegador). Como una peticion servidor-a-servidor
// no esta sujeta a CORS, este proxy hace de intermediario: el Angular
// le habla a ESTE servidor, y este servidor le habla a EUSTAT.
//
// El GET de metadatos de EUSTAT NO pasa por aqui: ese si funciona
// directo desde el navegador, asi que no hace falta tocarlo.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// IMPORTANTE: cors() y express.json() van SIEMPRE antes que
// cualquier ruta que los necesite. Una ruta registrada antes de estos
// dos use() no tiene body parseado ni cabeceras CORS -- por eso todo
// esto va aqui arriba, antes de app.post/app.get.

app.use(cors());

// Log de cada peticion entrante -- ANTES del parseo JSON a proposito:
// si el fallo esta en que Express no consigue parsear el body como
// JSON, la peticion nunca llegaria a un log colocado despues de
// express.json(). Puesto aqui, este log siempre se ejecuta.
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  console.log('  Content-Type recibido:', req.headers['content-type']);
  next();
});

app.use(express.json());

// =====================================================
// PROXY EUSTAT
// =====================================================

const EUSTAT_BASE = 'https://www.eustat.eus/bankupx/api/v1/es/DB';

app.post('/api/eustat-proxy/:archivo', async (req, res) => {
  try {
    const respuesta = await fetch(`${EUSTAT_BASE}/${req.params.archivo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const texto = await respuesta.text();

    if (!respuesta.ok) {
      console.error('EUSTAT respondio con error:', respuesta.status, texto);
      return res.status(respuesta.status).send(texto);
    }

    res.type('application/json').send(texto);
  } catch (error) {
    console.error('Error en el proxy EUSTAT:', error);
    res.status(502).json({ error: 'No se pudo contactar con EUSTAT' });
  }
});

// =====================================================
// BANCO DE TEXTOS DE LECTURA
//
// Sirve server/data/textos.json -- asi el banco de textos se puede
// editar (anadir/corregir cuentos, textos demo...) sin recompilar ni
// redesplegar la app Angular.
// =====================================================

const RUTA_TEXTOS = path.join(__dirname, 'data', 'textos.json');

app.get('/api/textos', (req, res) => {
  try {
    const contenido = fs.readFileSync(RUTA_TEXTOS, 'utf-8');
    res.type('application/json').send(contenido);
  } catch (error) {
    console.error('Error leyendo textos.json:', error);
    res.status(500).json({ error: 'No se pudo leer el banco de textos' });
  }
});

// =====================================================
// GENERACION DE PREGUNTAS CON IA (Gemini)
//
// El prompt ancla las preguntas ESTRICTAMENTE al texto recibido --
// esto es la parte importante para evitar que el modelo invente
// datos que no estan en el cuento (alucinaciones). Ademas de la
// pregunta, se le pide una cita literal del texto (citaTexto) que
// justifique la respuesta correcta, para dar contexto al alumno
// cuando corrige.
// =====================================================

// Colapsa espacios/tabs/saltos de linea repetidos a uno solo, para
// comparar cita vs texto original sin que un espacio doble o un \n
// distinto cuente como una diferencia real.
function normalizarEspacios(cadena) {
  return cadena.replace(/\s+/g, ' ').trim();
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODELO = 'gemini-3.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELO}:generateContent`;

function construirPrompt(texto, idioma, numPreguntas) {
  const idiomaTexto = idioma === 'eu' ? 'euskera' : 'castellano';

  // Empujon extra para que, si el mismo texto vuelve a pedirse (por
  // ejemplo porque el pool de candidatos es pequeno y toca repetido),
  // el modelo no converja siempre al mismo conjunto de 4 preguntas.
  // Sin esto, con responseSchema fijando tanto la forma de la salida,
  // Gemini tiende a ser muy repetitivo para el mismo texto de entrada.
  const enfoques = [
    'los personajes y sus motivaciones',
    'la secuencia temporal de los hechos',
    'las causas y consecuencias de lo que ocurre',
    'los detalles concretos (lugares, cantidades, nombres)',
    'el desenlace y como se llega a el',
  ];
  const enfoqueElegido = enfoques[Math.floor(Math.random() * enfoques.length)];

  return `Eres un profesor de Educacion Secundaria (ESO) disenando un
ejercicio de comprension lectora.

TEXTO (en ${idiomaTexto}):
"""
${texto}
"""

Genera exactamente ${numPreguntas} preguntas de comprension lectora de
opcion multiple sobre ESE TEXTO, en ${idiomaTexto}. Esta vez, dale peso
especial a preguntas relacionadas con: ${enfoqueElegido}.

Reglas estrictas:
- Las preguntas y sus respuestas deben poder contestarse UNICAMENTE
  con la informacion que aparece en el texto de arriba. No anadas
  datos, nombres ni hechos que no esten en el texto.
- Cada pregunta tiene exactamente 4 opciones, y solo una es correcta.
- El nivel debe ser apropiado para alumnado de Educacion Secundaria
  (12-16 anos): preguntas claras, sin ambiguedad.
- Varia el tipo de pregunta: alguna literal (un dato que aparece
  explicito) y alguna de comprension mas general (por que ocurre algo,
  que relacion hay entre dos hechos del texto).
- Para cada pregunta, incluye en "citaTexto" la frase EXACTA del texto
  de arriba (copiada tal cual, sin cambiar ni una palabra) que
  justifica la respuesta correcta. Si la respuesta se apoya en varias
  frases, elige la mas directa. Nunca inventes ni parafrasees esta
  cita: tiene que poder encontrarse, palabra por palabra, dentro del
  texto original.`;
}

app.post('/api/generar-preguntas', async (req, res) => {
  const { texto, idioma, numPreguntas = 2 } = req.body;

  if (!texto || !idioma) {
    return res.status(400).json({ error: 'Faltan "texto" o "idioma" en el body' });
  }

  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY no configurada (revisa tu .env)');
    return res.status(500).json({ error: 'El servidor no tiene configurada la API key de IA' });
  }

  try {
    const respuesta = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: construirPrompt(texto, idioma, numPreguntas) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          // Por defecto el modelo puede usar una temperature baja, y
          // combinado con responseSchema (que ya de por si fuerza
          // mucho la forma de la respuesta) el resultado es muy poco
          // variado para el mismo texto de entrada. 1.0 le da margen
          // para explorar sin dejar de respetar el schema.
          temperature: 1.0,
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                enunciado: { type: 'STRING' },
                opciones: { type: 'ARRAY', items: { type: 'STRING' } },
                respuestaCorrecta: { type: 'INTEGER' },
                citaTexto: { type: 'STRING' },
              },
              required: ['enunciado', 'opciones', 'respuestaCorrecta', 'citaTexto'],
            },
          },
        },
      }),
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      console.error('Gemini respondio con error:', respuesta.status, JSON.stringify(datos));
      return res.status(502).json({ error: 'Error generando preguntas con IA' });
    }

    const textoJson = datos.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textoJson) {
      console.error('Respuesta de Gemini sin el contenido esperado:', JSON.stringify(datos));
      return res.status(502).json({ error: 'Respuesta de IA vacia o con formato inesperado' });
    }

    const preguntasCrudas = JSON.parse(textoJson);

    // Anadimos un id propio -- Gemini no lo genera. Si citaTexto no es
    // un fragmento real del texto (el modelo lo parafraseo pese a la
    // instruccion), lo dejamos en null en vez de mostrar al alumno
    // algo que no esta realmente en la lectura.
    //
    // La comparacion se hace normalizando espacios/saltos de linea en
    // ambos lados (normalizarEspacios) -- una comparacion exacta con
    // texto.includes() fallaba con cosas tan tontas como un espacio
    // doble o un salto de linea distinto entre la cita y el texto
    // original, aunque la cita fuera correcta.
    const preguntas = preguntasCrudas.map((p, i) => {
      const citaValida =
        typeof p.citaTexto === 'string' &&
        normalizarEspacios(texto).includes(normalizarEspacios(p.citaTexto));

      // --- Temporal: para ver en la terminal por que se acepta o se
      // descarta cada cita. Quitar cuando ya no haga falta depurar. ---
      console.log(`Pregunta ${i + 1} -- citaTexto ${citaValida ? 'ACEPTADA' : 'DESCARTADA'}:`, JSON.stringify(p.citaTexto));

      return {
        id: `ia-${Date.now()}-${i}`,
        ...p,
        citaTexto: citaValida ? p.citaTexto : null,
      };
    });

    res.json(preguntas);

  } catch (error) {
    console.error('Error generando preguntas:', error);
    res.status(500).json({ error: 'Error interno generando preguntas' });
  }
});

// =====================================================
// GENERACION DE EJERCICIOS DE MATEMATICAS/CIENCIAS CON IA
//
// A diferencia de /api/generar-preguntas, aqui NO hay un texto de
// origen: el ejercicio entero (enunciado, opciones, respuesta) lo
// inventa Gemini a partir solo del curso y la materia. Eso significa
// que no hay nada contra lo que verificar la respuesta (a diferencia
// de citaTexto en lectura, que SI se contrasta con texto.includes()).
//
// Riesgo real, sobre todo en matematicas: un LLM puede dar una
// respuesta "correcta" con un error de calculo silencioso. El prompt
// le pide que resuelva paso a paso antes de fijar la respuesta, lo
// cual reduce el riesgo pero no lo elimina. Si esto se usa en serio,
// lo razonable seria revisar una muestra a mano, o mover matematicas
// a generacion por plantillas con la respuesta calculada por codigo.
// =====================================================

const NIVEL_DESCRIPCION = {
  '1': '1o de ESO (12-13 anos, contenidos de refuerzo de primaria y primeros conceptos de ESO)',
  '2': '2o de ESO (13-14 anos)',
  '3': '3o de ESO (14-15 anos)',
  '4': '4o de ESO (15-16 anos, previo a Bachillerato)',
};

function construirPromptEjercicio(materia, curso, idioma, numPreguntas) {
  const idiomaTexto = idioma === 'eu' ? 'euskera' : 'castellano';
  const nivelDescripcion = NIVEL_DESCRIPCION[curso] || NIVEL_DESCRIPCION['2'];
  const materiaTexto = materia === 'matematicas'
    ? 'matematicas'
    : 'ciencias (biologia, fisica, quimica o geologia -- elige tu el tema de cada ejercicio)';

  return `Eres un profesor de Educacion Secundaria (ESO) disenando ${numPreguntas}
ejercicios de opcion multiple de ${materiaTexto} para un alumno de
${nivelDescripcion}, en ${idiomaTexto}.

Reglas estrictas:
- Cada ejercicio tiene exactamente 4 opciones, y solo una es correcta.
- Antes de fijar la respuesta correcta, resuelve el ejercicio paso a
  paso mentalmente y comprueba el resultado -- los ejercicios de
  matematicas deben tener un unico resultado numerico correcto e
  inequivoco, sin errores de calculo.
- Las opciones incorrectas deben ser plausibles (errores tipicos que
  cometeria un alumno de ese curso), no absurdas.
- El nivel de dificultad tiene que corresponder EXACTAMENTE al curso
  indicado -- ni contenidos de cursos posteriores, ni demasiado facil
  para ese curso.
- Varia los ejercicios entre si: no repitas el mismo tipo de problema
  cambiando solo los numeros o los nombres.
- En "explicacion", da una explicacion breve (2-3 frases) de como se
  resuelve el ejercicio y por que esa es la respuesta correcta.`;
}

app.post('/api/generar-ejercicios', async (req, res) => {
  const { materia, curso, idioma, numPreguntas = 4 } = req.body;

  if (!materia || !curso || !idioma) {
    return res.status(400).json({ error: 'Faltan "materia", "curso" o "idioma" en el body' });
  }

  if (materia !== 'matematicas' && materia !== 'ciencias') {
    return res.status(400).json({ error: 'materia debe ser "matematicas" o "ciencias"' });
  }

  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY no configurada (revisa tu .env)');
    return res.status(500).json({ error: 'El servidor no tiene configurada la API key de IA' });
  }

  try {
    const respuesta = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: construirPromptEjercicio(materia, curso, idioma, numPreguntas) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 1.0,
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                enunciado: { type: 'STRING' },
                opciones: { type: 'ARRAY', items: { type: 'STRING' } },
                respuestaCorrecta: { type: 'INTEGER' },
                explicacion: { type: 'STRING' },
              },
              required: ['enunciado', 'opciones', 'respuestaCorrecta', 'explicacion'],
            },
          },
        },
      }),
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      console.error('Gemini respondio con error:', respuesta.status, JSON.stringify(datos));
      return res.status(502).json({ error: 'Error generando ejercicios con IA' });
    }

    const textoJson = datos.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textoJson) {
      console.error('Respuesta de Gemini sin el contenido esperado:', JSON.stringify(datos));
      return res.status(502).json({ error: 'Respuesta de IA vacia o con formato inesperado' });
    }

    const ejerciciosCrudos = JSON.parse(textoJson);

    const ejercicios = ejerciciosCrudos.map((e, i) => ({
      id: `ia-${Date.now()}-${i}`,
      ...e,
    }));

    res.json(ejercicios);

  } catch (error) {
    console.error('Error generando ejercicios:', error);
    res.status(500).json({ error: 'Error interno generando ejercicios' });
  }
});

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, '0.0.0.0', () => {
  console.log(`Proxy EUSTAT escuchando en http://localhost:${PUERTO}`);
});

// Manejador de errores explicito -- SIEMPRE va al final, despues de
// las rutas. Si express.json() no consigue parsear el body, Express
// llama a este manejador en vez de a la ruta, y por defecto responderia
// con un 400 y el texto plano "Bad Request" sin mas explicacion. Aqui
// lo interceptamos para ver el motivo real.
app.use((err, req, res, next) => {
  console.error('Error atrapado por el manejador global:');
  console.error('  Tipo:', err.type);
  console.error('  Mensaje:', err.message);
  console.error('  Status:', err.status || err.statusCode);

  res.status(err.status || err.statusCode || 500).json({
    error: err.message,
    tipo: err.type || 'desconocido',
  });
});