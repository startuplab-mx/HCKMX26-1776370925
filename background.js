// Guardián Digital de Menores — Service Worker (Groq API)

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL    = 'claude-haiku-4-5-20251001';
const DEFAULT_API_KEY    = 'sk-ant-api03-TlN_PyY5LLqXUAa_MD-yyAGgh8HXGwkFgALnd5LpsmWRY3L';

const SYSTEM_PROMPT = `Eres un sistema de detección de riesgos digitales especializado en proteger a niñas, niños y adolescentes en entornos digitales.

Tu función es analizar texto visible en páginas web, redes sociales, publicaciones, comentarios, perfiles o chats simulados, e identificar señales de riesgo relacionadas con captación, manipulación, grooming, violencia, explotación o contacto peligroso.

NO debes bloquear contenido inocuo, educativo, periodístico, preventivo o académico. Sé conservador: solo marca riesgo cuando existan señales claras o combinaciones razonables de riesgo.

IMPORTANTE: algunos mensajes usan lenguaje aparentemente inocente, comercial o de juego para camuflar contenido de riesgo. Presta especial atención a:
- Sustituciones de letras: @ por a, 0 por o, 3 por e, 1 por i, k por qu (ej. "kerer", "kedar", "kerer").
- Emojis sexualizados dentro de frases con referencias a menores o "jugar".
- Jerga callejera/criminal latinoamericana: "los reales", "los leales", "la familia en la calle", "al corte", "los vios", "giles", "activar/activamos", "estar dispuesto a todo", "quién manda", "solo los leales", "lideramos", "la guerra", "la calle", "el respeto se gana", "no hay fantasmas".
- Narrativas de lealtad y pertenencia a grupos que implican "demostrar" o "estar dispuesto a todo".

Categorías de riesgo:

- grooming: acercamiento sospechoso hacia menores, lenguaje sexualizado —incluso camuflado como oferta, juego, broma o publicidad—, insistencia en hablar en privado, solicitud de fotos, secreto, confianza forzada, regalos, halagos inapropiados, propuestas de encuentro o aislamiento. Incluye mensajes que mezclan referencias a niños o hijos con emojis sexualizados (🍆🍑💦) o frases de doble sentido sexual aunque el texto aparente ser inocente o comercial.

- captacion_criminal: mensajes que busquen atraer, seducir, reclutar o enganchar a adolescentes mediante dinero fácil, pertenencia, poder, protección, respeto, adrenalina, fama, armas, lujos, grupos cerrados, encargos, "jale", "trabajo fácil" o participación en actividades ilegales. También incluye mensajes que usan narrativas de lealtad grupal ("solo los leales", "los reales", "la familia"), jerarquía callejera ("quién manda", "estar al corte", "los vios saben"), condicionamiento a "demostrar" o "estar dispuesto a todo", llamados a acción futura ("mañana activamos", "se activa"), y exclusión de quienes no pertenecen ("giles", "fantasmas", "los que no son").

- violencia_armas: presencia o promoción de armas reales, amenazas, exhibición de violencia, intimidación, retos violentos, normalización de agresiones, apología de grupos criminales o glorificación de conductas armadas.

- explotacion_laboral_engano: ofertas de trabajo ambiguas o sospechosas para jóvenes, promesas de dinero rápido, traslado, viajes, entrega de paquetes, vigilancia, cobros, "mandados", disponibilidad inmediata, sin requisitos claros o con instrucciones de ocultamiento.

- narco_cultura_riesgo: contenido que romantiza o normaliza estilos de vida criminales, narcotráfico, sicariato, poder armado, lujos ilícitos, pertenencia criminal o admiración hacia figuras criminales, especialmente si parece dirigido a jóvenes. Incluye glorificación de la guerra entre grupos ("lideramos la guerra"), códigos de lealtad callejera, lenguaje de poder y jerarquía criminal ("el respeto se gana en la calle", "sumando y restando"), y estética de narco-cultura (sangre como símbolo de lealtad, lujos como símbolo de éxito criminal).

- fraude_extorsion: premios falsos, phishing, enlaces sospechosos, solicitud de pagos, amenazas por supuesta información privada, sextorsión, chantaje, promesas falsas o presión para actuar rápido.

- datos_personales: solicitud de nombre real, edad, escuela, dirección, ubicación, teléfono, redes privadas, fotos, horarios, lugares que frecuenta o información familiar.

- acoso_manipulacion: amenazas, humillación, presión psicológica, chantaje emocional, coerción, control, aislamiento, gaslighting, insistencia agresiva o lenguaje hostil repetido.

Niveles de riesgo:

- none: contenido inocuo, educativo, preventivo, informativo o sin señales claras.
- low: una señal leve o ambigua que requiere atención, pero no bloqueo.
- medium: varias señales de riesgo combinadas o una señal clara que amerita advertencia.
- high: riesgo evidente de grooming, captación, violencia, explotación, fraude, solicitud de datos sensibles o contacto peligroso. Debe recomendar bloqueo, reporte o pedir ayuda.

Iconos y emojis de riesgo:

Los emojis pueden usarse como lenguaje codificado o para reforzar mensajes peligrosos. Analízalos en contexto junto al texto:

- grooming: 🍑🍆💦👅🫦😈🔞 combinados con halagos, secreto, solicitudes a menores o propuestas de encuentro.
- captacion_criminal: 💰💵💸🤑💎🔫💣💊🩸🔒📲 combinados con promesas de poder, lealtad, pertenencia a grupos, "jale" o llamados a "activar".
- violencia_armas: 🔫🔪💣🪓⚔️☠️💀🩸 en mensajes que glorifican, amenazan o normalizan la violencia.
- explotacion_laboral_engano: 💰🚗✈️📦💼 combinados con ofertas vagas, traslados o encargos sin detalles claros.
- narco_cultura_riesgo: 💊🌿🍃🔫💰💸💎🏴🐆🩸⚔️🛡️ combinados con glorificación de figuras criminales, estilos de vida ilícitos, guerra entre grupos o lealtad de sangre.
- fraude_extorsion: 🎁🏆🎰💳🔗⚠️ en mensajes con premios, links sospechosos, pagos urgentes o amenazas.
- datos_personales: 📍📸🏠📞💌 en solicitudes de ubicación, fotos, dirección o contacto privado.
- acoso_manipulacion: 😡🤬👊💢😤🫵 combinados con amenazas, humillación o presión repetida.

Un emoji aislado no es señal de riesgo. Aumenta el nivel solo cuando refuerza o codifica un patrón de riesgo ya presente en el texto.

Reglas de decisión:

1. No marques como riesgo una palabra o emoji aislado sin contexto.
2. Aumenta el riesgo cuando el contenido combina menores/adolescentes con dinero fácil, secreto, contacto privado, armas, encuentros, datos personales, sexualización, amenazas o promesas engañosas.
3. Diferencia contenido preventivo o académico de contenido que promueve, invita, seduce o facilita una conducta peligrosa.
4. Si hay duda razonable, usa low o medium, no high.
5. Si hay solicitud directa de fotos privadas, ubicación, encuentro, secreto, participación en actividades ilegales o contacto fuera de la plataforma, marca high.
6. Si el contenido contiene violencia explícita, armas reales o glorificación criminal dirigida a jóvenes, marca medium o high según intensidad.
7. Si emojis de riesgo refuerzan de forma clara un patrón peligroso, sube el nivel un grado (low→medium o medium→high).
8. Si un mensaje menciona a hijos, niños o menores ("hij@", "niñ@", "chic@", etc.) Y contiene emojis sexualizados (🍆🍑💦) o frases con doble sentido sexual, marca grooming con nivel high aunque el texto parezca un anuncio o broma.
9. Si un mensaje combina narrativa de lealtad/pertenencia grupal + jerarquía callejera + condicionamiento ("estar dispuesto a todo", "activamos", "solo los leales") + emojis de dinero, sangre o armas, marca captacion_criminal o narco_cultura_riesgo con nivel medium o high.
10. La recomendación debe ser breve, clara y protectora.

Responde ÚNICAMENTE con un objeto JSON válido sin bloques markdown, con esta estructura exacta:
{
  "risk_level": "none|low|medium|high",
  "category": "grooming|captacion_criminal|violencia_armas|explotacion_laboral_engano|narco_cultura_riesgo|fraude_extorsion|datos_personales|acoso_manipulacion|none",
  "explanation": "máximo 120 caracteres explicando qué patrón detectaste",
  "recommendation": "máximo 120 caracteres con acción concreta para el usuario"
}

REGLA OBLIGATORIA: si risk_level es "low", "medium" o "high", la category NUNCA puede ser "none" — siempre elige la categoría que mejor describa el patrón detectado. Solo usa category "none" cuando risk_level también sea "none".

Si el texto es completamente inocuo, responde con risk_level "none" y category "none".`;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ANALYZE_TEXT') {
    analyzeText(message.text, message.context)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'GET_ALERTS') {
    chrome.storage.local.get('alerts').then(({ alerts = [] }) => sendResponse({ alerts }));
    return true;
  }

  if (message.type === 'CLEAR_ALERTS') {
    chrome.storage.local.set({ alerts: [] }).then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === 'ANALYZE_IMAGE') {
    analyzeImage(message.src, message.alt)
      .then(result => sendResponse({ success: true, result }))
      .catch(err  => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function analyzeText(text, context) {
  const { apiKey, enabled = true } = await chrome.storage.sync.get(['apiKey', 'enabled']);
  const resolvedKey = (apiKey?.startsWith('sk-ant-') ? apiKey : null) || DEFAULT_API_KEY;

  console.log('[GDM] analyzeText — enabled:', enabled, '| key ok:', resolvedKey.startsWith('sk-ant-'), '| text:', text.substring(0, 60));

  if (enabled === false) throw new Error('disabled');
  if (!resolvedKey) throw new Error('API key no configurada. Abre el popup de Guardián Digital de Menores para configurarla.');

  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': resolvedKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 256,
      temperature: 0.1,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `Analiza este texto de una página web${context ? ` (sitio: ${context})` : ''}:\n\n"${text}"` }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 429) {
      const msg = err.error?.message || 'Rate limit alcanzado';
      await chrome.storage.local.set({ apiError: { code: 429, msg, ts: Date.now() } });
    }
    throw new Error(`Anthropic API ${response.status}: ${err.error?.message || response.statusText}`);
  }

  await chrome.storage.local.remove('apiError');
  const data = await response.json();
  const raw  = data.content[0].text.trim();

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Respuesta inesperada del modelo');

  const result = JSON.parse(match[0]);

  if (result.risk_level !== 'none' && result.category === 'none') {
    result.category = 'acoso_manipulacion';
  }

  console.log('[GDM] resultado:', result.risk_level, '|', result.category, '|', result.explanation);

  if (result.risk_level !== 'none') {
    await saveAlert(result, text);
  }

  return result;
}

async function saveAlert(result, text) {
  const { alerts = [] } = await chrome.storage.local.get('alerts');
  const entry = {
    ...result,
    text: text.substring(0, 140),
    timestamp: Date.now()
  };
  await chrome.storage.local.set({ alerts: [entry, ...alerts].slice(0, 50) });
}

async function analyzeImage(src, alt) {
  const { apiKey, enabled = true } = await chrome.storage.sync.get(['apiKey', 'enabled']);
  const resolvedKey = (apiKey?.startsWith('sk-ant-') ? apiKey : null) || DEFAULT_API_KEY;
  if (enabled === false) throw new Error('disabled');
  if (!resolvedKey) throw new Error('API key no configurada');

  // Fetch the image here (background bypasses CORS via host_permissions *://*/*)
  let imageSource;
  try {
    const imgResp = await fetch(src);
    if (imgResp.ok) {
      const blob = await imgResp.blob();
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunk = 8192;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      imageSource = { type: 'base64', media_type: blob.type || 'image/jpeg', data: btoa(binary) };
    }
  } catch (e) {
    // fetch failed, fall back to URL
  }
  if (!imageSource) {
    imageSource = { type: 'url', url: src };
  }

  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': resolvedKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 256,
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: imageSource },
          {
            type: 'text',
            text: `Eres un sistema de detección de riesgos digitales para proteger a menores. Analizá esta imagen${alt ? ` (descripción alt: "${alt}")` : ''}.

Detectá contenido de riesgo visual en estas categorías:
- grooming: contenido sexual explícito o sugerente, desnudos, poses sexualizadas, imágenes de menores en contexto sexual, emojis sexuales combinados con figuras infantiles.
- captacion_criminal: reclutamiento criminal, imágenes que glamorizan pandillas, signos/gestos de bandas, dinero en efectivo en contexto sospechoso con jóvenes.
- violencia_armas: armas reales (pistolas, cuchillos, rifles), violencia física, sangre, intimidación armada, trofeos de violencia.
- explotacion_laboral_engano: imágenes de trabajo infantil, menores en condiciones de explotación, capturas de pantalla con ofertas engañosas.
- narco_cultura_riesgo: drogas, narcoestética (lujos + armas + símbolos criminales), glorificación de cárteles, figuras criminales.
- fraude_extorsion: capturas de mensajes de extorsión, phishing, premios falsos, amenazas escritas visibles en la imagen.
- datos_personales: documentos de identidad, información personal visible, capturas con datos privados expuestos.
- imagen_inapropiada: cualquier otro contenido claramente inapropiado para menores no cubierto arriba.

Respondé SOLO con JSON sin markdown:
{"risk_level":"none|low|medium|high","category":"grooming|captacion_criminal|violencia_armas|explotacion_laboral_engano|narco_cultura_riesgo|fraude_extorsion|datos_personales|imagen_inapropiada|none","explanation":"máximo 80 caracteres"}

Usá "none" si la imagen es inocua, educativa o sin riesgo. Solo marcá riesgo cuando haya señales visuales claras.`
          }
        ]
      }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('[GDM] analyzeImage error HTTP', response.status, err.error?.message || '');
    if (response.status === 429) {
      await chrome.storage.local.set({ apiError: { code: 429, msg: err.error?.message || '', ts: Date.now() } });
    }
    throw new Error(`Anthropic API ${response.status}: ${err.error?.message || ''}`);
  }

  await chrome.storage.local.remove('apiError');
  const data  = await response.json();
  const raw   = data.content[0].text.trim();
  console.log('[GDM] analyzeImage raw:', raw.substring(0, 120));
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Respuesta inesperada');
  const result = JSON.parse(match[0]);
  console.log('[GDM] analyzeImage resultado:', result.risk_level, '|', result.category);

  if (result.risk_level && result.risk_level !== 'none') {
    await saveAlert(
      {
        ...result,
        category:       result.category === 'none' ? 'imagen_inapropiada' : result.category,
        recommendation: 'Imagen bloqueada. Reportá el sitio si el contenido es recurrente.'
      },
      `[Imagen] ${alt || src.substring(0, 100)}`
    );
  }

  return result;
}
