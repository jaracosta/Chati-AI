// CHATI-AI V8 — interface language (Spanish / English).
// Detects the device language (or the choice in Settings) and translates the
// app's own interface text. Chat messages, character names and anything the
// user typed are never touched: only exact, known interface strings change.
(() => {
  "use strict";

  const STORAGE_KEY = "chatiLanguageV8";

  const ES = {
    // Navigation & shell
    "Home": "Inicio",
    "Chats": "Chats",
    "Create": "Crear",
    "Profile": "Perfil",
    "Settings": "Ajustes",
    "Explore": "Explorar",
    "Ready-made characters. Tap one to start chatting.": "Personajes listos para chatear. Toca uno para empezar.",
    "Primary navigation": "Navegación principal",
    "Open navigation": "Abrir navegación",
    "Close navigation": "Cerrar navegación",
    "Collapse sidebar": "Contraer barra lateral",
    "Expand sidebar": "Expandir barra lateral",
    "Search": "Buscar",
    "Search chats & characters": "Buscar chats y personajes",
    "Search chats and characters": "Buscar chats y personajes",
    "Clear search": "Borrar búsqueda",
    "Recent Chats": "Chats recientes",
    "No chats yet": "Aún no hay chats",
    "Go to chats": "Ir a chats",
    "Close": "Cerrar",
    "Cancel": "Cancelar",
    "Done": "Listo",
    "Delete": "Eliminar",
    "Edit": "Editar",
    "Copy": "Copiar",
    "Remove": "Quitar",
    "Ready": "Listo",
    "Local": "Local",
    "N/A": "N/D",

    // Home
    "Your Characters": "Tus personajes",
    "Choose a character and start chatting.": "Elige un personaje y empieza a chatear.",
    "No characters yet": "Aún no hay personajes",
    "Create your first AI character and start chatting.": "Crea tu primer personaje de IA y empieza a chatear.",
    "+ Create Character": "+ Crear personaje",
    "Create Character": "Crear personaje",
    "AI Character": "Personaje de IA",
    "Your Groups": "Tus grupos",
    "Shared conversations": "Conversaciones compartidas",

    // Create choice
    "What do you want to make?": "¿Qué quieres crear?",
    "Start a new character or bring existing characters together.": "Crea un personaje nuevo o junta personajes que ya tienes.",
    "New Character": "Personaje nuevo",
    "Build a new personality and world.": "Crea una personalidad y un mundo nuevos.",
    "New Group": "Grupo nuevo",
    "Chat with multiple existing characters.": "Chatea con varios personajes a la vez.",
    "Create at least two characters before making a group.": "Crea al menos dos personajes antes de hacer un grupo.",

    // Character editor
    "Build the personality, identity, and world of your AI.": "Crea la personalidad, la identidad y el mundo de tu IA.",
    "Change the character without deleting their chats or memory.": "Cambia el personaje sin borrar sus chats ni su memoria.",
    "Avatar & Identity": "Avatar e identidad",
    "Avatar Image URL": "URL de la imagen del avatar",
    "Choose Image": "Elegir imagen",
    "Choose from your computer, phone gallery, or camera when available.": "Elige desde tu computadora, la galería o la cámara.",
    "Character Name": "Nombre del personaje",
    "Pronouns": "Pronombres",
    "Bot Bio": "Biografía",
    "The character's public identity.": "La identidad pública del personaje.",
    "A short description shown beside the character.": "Una descripción corta que se muestra junto al personaje.",
    "Appearance & Outfit": "Apariencia y ropa",
    "Give the character a consistent visual identity for the roleplay.": "Dale al personaje una identidad visual constante para el rol.",
    "Physical Appearance": "Apariencia física",
    "Hair, eyes, build, height, distinctive features, scars, markings...": "Cabello, ojos, complexión, estatura, rasgos, cicatrices, marcas...",
    "Default Outfit": "Ropa habitual",
    "What the character normally wears when no special outfit is established...": "Lo que el personaje usa normalmente si no se indica otra ropa...",
    "Starting Outfit": "Ropa inicial",
    "What they are wearing at the beginning of a new chat. Leave blank to use Default Outfit.": "Lo que lleva al empezar un chat nuevo. Déjalo vacío para usar la ropa habitual.",
    "Accessories & Equipment": "Accesorios y equipo",
    "Jewelry, glasses, bags, gloves, weapons, equipment, signature items...": "Joyas, lentes, bolsos, guantes, armas, equipo, objetos característicos...",
    "Maintain visual continuity": "Mantener continuidad visual",
    "Keep clothing and visible details consistent until the story clearly changes them.": "Mantiene la ropa y los detalles visibles hasta que la historia los cambie.",
    "Personality & Backstory": "Personalidad e historia",
    "Who they are, how they think, and what shaped them.": "Quién es, cómo piensa y qué lo marcó.",
    "Describe personality, habits, backstory, motivations, mannerisms, fears, values, relationships...": "Describe la personalidad, hábitos, historia, motivaciones, gestos, miedos, valores, relaciones...",
    "Scenario": "Escenario",
    "The starting situation or world for the roleplay.": "La situación o el mundo donde empieza el rol.",
    "Where are they? What is happening? What is their relationship with the user?": "¿Dónde están? ¿Qué está pasando? ¿Qué relación tiene con el usuario?",
    "Instructions": "Instrucciones",
    "Specific rules for how this character should behave and respond.": "Reglas específicas de cómo debe comportarse y responder.",
    "Example: Stay in character. Never control the user's actions. Keep dialogue natural...": "Ejemplo: Mantente en personaje. Nunca controles las acciones del usuario. Diálogo natural...",
    "Example Messages": "Mensajes de ejemplo",
    "Optional examples that teach the bot its voice and formatting.": "Ejemplos opcionales que le enseñan al bot su voz y su formato.",
    "＋ Add example": "＋ Agregar ejemplo",
    "What the user might say...": "Lo que el usuario podría decir...",
    "How the character should reply...": "Cómo debería responder el personaje...",
    "Powers & Abilities": "Poderes y habilidades",
    "Optional — only enable this for characters with powers or a combat system.": "Opcional: actívalo solo para personajes con poderes o sistema de combate.",
    "Power System / Source": "Sistema / fuente de poder",
    "Example: Reiatsu / Soul Reaper": "Ejemplo: Reiatsu / Shinigami",
    "Combat Style": "Estilo de combate",
    "Example: Swordsmanship and ice techniques": "Ejemplo: Esgrima y técnicas de hielo",
    "Abilities": "Habilidades",
    "List powers, transformations, techniques, weapons, spells...": "Lista poderes, transformaciones, técnicas, armas, hechizos...",
    "Rules / Limitations": "Reglas / límites",
    "Costs, weaknesses, limits, conditions, cooldowns...": "Costos, debilidades, límites, condiciones, tiempos de espera...",
    "Chat Background": "Fondo del chat",
    "Optional image shown behind this character's chat.": "Imagen opcional que se muestra detrás del chat.",
    "Background Image URL": "URL de la imagen de fondo",
    "No background selected": "No hay fondo seleccionado",
    "Save Changes": "Guardar cambios",
    "Edit Character": "Editar personaje",
    "Delete Character": "Eliminar personaje",

    // Groups
    "Create Group": "Crear grupo",
    "Group Identity": "Identidad del grupo",
    "Group Name": "Nombre del grupo",
    "Choose Characters": "Elegir personajes",
    "Bring your existing characters into one shared conversation.": "Junta a tus personajes en una sola conversación.",
    "Select at least two characters. Each one keeps their own personality, powers, and instructions.": "Elige al menos dos personajes. Cada uno conserva su personalidad, poderes e instrucciones.",
    "Choose at least two characters for the group.": "Elige al menos dos personajes para el grupo.",
    "Respond as": "Responder como",
    "Choose who should respond, then start the shared conversation.": "Elige quién responde y empieza la conversación compartida.",
    "That group character is no longer available.": "Ese personaje del grupo ya no está disponible.",
    "This group has no available character to respond.": "Este grupo no tiene personajes disponibles para responder.",
    "Name the conversation and choose an optional cinematic background.": "Ponle nombre a la conversación y elige un fondo opcional.",

    // Chat
    "New Chat": "Nuevo chat",
    "Conversation:": "Conversación:",
    "Message...": "Mensaje...",
    "Send": "Enviar",
    "Chat options": "Opciones del chat",
    "Rename Chat": "Renombrar chat",
    "Clear Chat": "Vaciar chat",
    "Delete Chat": "Eliminar chat",
    "Edit current character": "Editar personaje actual",
    "Current conversation": "Conversación actual",
    "Private": "Privado",
    "Private Chat": "Chat privado",
    "Private session": "Sesión privada",
    "Not saved": "No se guarda",
    "This chat is temporary and is not saved in browser storage.": "Este chat es temporal y no se guarda en el navegador.",
    "Add media": "Agregar archivo",
    "Send photo": "Enviar foto",
    "Send audio": "Enviar audio",
    "Send video": "Enviar video",
    "Remove attachment": "Quitar archivo",
    "Up to 30 seconds": "Hasta 30 segundos",
    "Up to 60 seconds": "Hasta 60 segundos",
    "Scene reference": "Referencia de la escena",
    "Scene or battle reference": "Referencia de escena o batalla",
    "Optional context for the current moment": "Contexto opcional para este momento",
    "Optional: Who is shown, heard, or what is happening?": "Opcional: ¿quién aparece, quién se oye o qué está pasando?",
    "Generate another version": "Generar otra versión",
    "Previous version": "Versión anterior",
    "Next version": "Versión siguiente",
    "Rewind to here": "Regresar hasta aquí",
    "Pin Memory": "Fijar en memoria",
    "There is no user message before this response.": "No hay un mensaje tuyo antes de esta respuesta.",

    // Memory
    "Chat Memory": "Memoria del chat",
    "View chat memory": "Ver memoria del chat",
    "Close memory": "Cerrar memoria",
    "This memory belongs only to this chat.": "Esta memoria pertenece solo a este chat.",
    "Memory status": "Estado de la memoria",
    "Memory has not been updated yet.": "La memoria todavía no se ha actualizado.",
    "Story Summary": "Resumen de la historia",
    "No summary yet.": "Aún no hay resumen.",
    "Important Memories": "Recuerdos importantes",
    "No memories yet": "Aún no hay recuerdos",
    "Pinned Memories": "Recuerdos fijados",
    "Current Scene": "Escena actual",
    "No current scene stored.": "No hay escena guardada.",
    "Current Appearance": "Apariencia actual",
    "No visual state is stored for this chat yet.": "Aún no hay estado visual guardado para este chat.",
    "Visual continuity": "Continuidad visual",
    "Relationship / Social State": "Relación / estado social",
    "No relationship development stored.": "No hay avances de relación guardados.",
    "Unresolved Threads": "Asuntos pendientes",

    // Settings
    "Control roleplay behavior and protect your local Chati-AI data.": "Controla el comportamiento del rol y protege tus datos de Chati-AI.",
    "Close settings": "Cerrar ajustes",
    "Conversation behavior": "Comportamiento de la conversación",
    "Roleplay Level": "Nivel de rol",
    "Roleplay level": "Nivel de rol",
    "Higher levels increase narrative depth, emotional intensity, continuity, and cinematic detail.": "Los niveles altos aumentan la profundidad narrativa, la intensidad emocional, la continuidad y el detalle cinematográfico.",
    "Regular": "Normal",
    "Natural conversation with lighter detail and shorter scene beats.": "Conversación natural, con menos detalle y escenas más cortas.",
    "Advanced": "Avanzado",
    "Richer emotion, stronger continuity, cinematic action, and expressive relationships.": "Más emoción, mejor continuidad, acción cinematográfica y relaciones expresivas.",
    "Super Advanced": "Súper avanzado",
    "Most immersive": "El más inmersivo",
    "Maximum continuity, layered emotion, complex relationships, darker drama, and intense cinematic scenes.": "Máxima continuidad, emociones profundas, relaciones complejas, drama más oscuro y escenas intensas.",
    "Levels change storytelling depth. Sexual content involving minors is never allowed in any mode.": "Los niveles cambian la profundidad de la historia. El contenido sexual con menores nunca está permitido.",
    "NSFW (18+)": "NSFW (18+)",
    "Only for adults.": "Solo para adultos.",
    "Create image": "Crear imagen",
    "The character sends you a picture": "El personaje te manda una imagen",
    "sends a picture": "manda una imagen",
    "The image was blocked by the safety filter. Try a different request.": "El filtro de seguridad bloqueó la imagen. Prueba con otra petición.",
    "The image was blocked by the safety filter. Turn on NSFW (18+) in Settings or try a different request.": "El filtro de seguridad bloqueó la imagen. Activa NSFW (18+) en Ajustes o prueba con otra petición.",
    "Image generation isn't set up on the server yet.": "La generación de imágenes todavía no está configurada en el servidor.",
    "Couldn't prepare the image. Please try again.": "No se pudo preparar la imagen. Inténtalo de nuevo.",
    "The image model didn't return a picture. Try a different request.": "El modelo no devolvió ninguna imagen. Prueba con otra petición.",
    "Couldn't create the image right now. Please try again.": "No se pudo crear la imagen ahora. Inténtalo de nuevo.",
    "NSFW content is only for adults.\n\nConfirm that you are 18 years or older.": "El contenido NSFW es solo para adultos.\n\nConfirma que tienes 18 años o más.",
    "Language": "Idioma",
    "Automatic": "Automático",
    "App experience": "Experiencia de la app",
    "Install Chati-AI": "Instalar Chati-AI",
    "Install": "Instalar",
    "Installed": "Instalada",
    "Chati-AI is installed": "Chati-AI está instalada",
    "Install Chati-AI on this device": "Instala Chati-AI en este dispositivo",
    "Add Chati-AI to your Home Screen": "Agrega Chati-AI a tu pantalla de inicio",
    "Open it like an app from your desktop or Home Screen.": "Ábrela como app desde tu escritorio o pantalla de inicio.",
    "Open Chati-AI in its own window and launch it directly from your device.": "Abre Chati-AI en su propia ventana, directo desde tu dispositivo.",
    "Install Chati-AI for a cleaner standalone window, Home Screen access, and a more app-like experience.": "Instala Chati-AI para tener su propia ventana, acceso desde la pantalla de inicio y una experiencia de app.",
    "You are already running Chati-AI in standalone app mode.": "Ya estás usando Chati-AI como app instalada.",
    "Install from your browser": "Instalar desde tu navegador",
    "Browser": "Navegador",
    "Browser Menu": "Menú del navegador",
    "Use Share": "Usa Compartir",
    "Home Screen": "Pantalla de inicio",
    "On iPhone or iPad, use Safari's Share menu and choose Add to Home Screen.": "En iPhone o iPad, usa el menú Compartir de Safari y elige «Agregar a inicio».",
    "Chati-AI can still be installed from your browser menu even when the in-page install prompt is not exposed.": "Puedes instalar Chati-AI desde el menú del navegador aunque no aparezca el aviso de instalación.",
    "Use your browser's page/app installation menu. In Chrome: menu > Send, save and share > Install page as app.": "Usa el menú de instalación de tu navegador. En Chrome: menú > Enviar, guardar y compartir > Instalar página como app.",
    "Dismiss install suggestion": "Ocultar sugerencia de instalación",
    "Your data": "Tus datos",
    "Backup & Restore": "Copia de seguridad",
    "Move your saved characters, groups, chats, memory, images, and settings to another browser, device, or future Chati-AI domain.": "Pasa tus personajes, grupos, chats, memoria, imágenes y ajustes a otro navegador, dispositivo o dominio de Chati-AI.",
    "Export Backup": "Exportar copia",
    "Export backup": "Exportar copia",
    "Download a portable copy of your saved Chati-AI data.": "Descarga una copia de tus datos de Chati-AI.",
    "Include stored media": "Incluir archivos guardados",
    "Also back up saved audio and video from normal chats. This can make the file much larger.": "También guarda el audio y video de los chats normales. El archivo puede ser mucho más grande.",
    "Restore backup": "Restaurar copia",
    "Choose Backup": "Elegir copia",
    "Import a Chati-AI backup. Saved local data will be replaced, then the app will reload.": "Importa una copia de Chati-AI. Los datos locales se reemplazarán y la app se recargará.",
    "Reading backup...": "Leyendo copia...",
    "Backed up": "Copiado",
    "Restored": "Restaurado",
    "Restore cancelled. Nothing was changed.": "Restauración cancelada. No se cambió nada.",
    "Backup failed. Your existing Chati-AI data was not changed.": "La copia falló. Tus datos de Chati-AI no cambiaron.",
    "Private Chat and Private Group Chat are temporary and are never included in backups.": "El chat privado y el grupo privado son temporales y nunca se incluyen en las copias.",
    "Private Chat and Private Group remain temporary and will never be uploaded to the cloud.": "El chat privado y el grupo privado son temporales y nunca se suben a la nube.",

    // Account
    "Account": "Cuenta",
    "Account & cloud": "Cuenta y nube",
    "Account profile": "Perfil de la cuenta",
    "Chati-AI Account": "Cuenta de Chati-AI",
    "Sign in": "Iniciar sesión",
    "Sign In": "Iniciar sesión",
    "Sign Out": "Cerrar sesión",
    "Signed in": "Sesión iniciada",
    "Not signed in": "Sin sesión",
    "Switch account": "Cambiar de cuenta",
    "Create Account": "Crear cuenta",
    "New account": "Cuenta nueva",
    "Welcome back": "Qué bueno verte de nuevo",
    "Welcome to Chati-AI": "Bienvenido a Chati-AI",
    "Email": "Correo",
    "Password": "Contraseña",
    "Confirm Password": "Confirmar contraseña",
    "At least 8 characters": "Al menos 8 caracteres",
    "Use at least 8 characters.": "Usa al menos 8 caracteres.",
    "Forgot password?": "¿Olvidaste tu contraseña?",
    "Reset Password": "Restablecer contraseña",
    "Send Reset Link": "Enviar enlace",
    "Back to Sign In": "Volver a iniciar sesión",
    "Account recovery": "Recuperar cuenta",
    "Choose a New Password": "Elige una contraseña nueva",
    "Enter the new password again": "Escribe de nuevo la contraseña",
    "Update Password": "Actualizar contraseña",
    "Close account form": "Cerrar formulario",
    "Sign in to sync normal characters and cloud media across your devices.": "Inicia sesión para sincronizar tus personajes y archivos entre dispositivos.",
    "Your characters belong to your account. Sign in to restore them on this device.": "Tus personajes son de tu cuenta. Inicia sesión para recuperarlos en este dispositivo.",
    "Cloud sync is active for normal characters and media.": "La sincronización en la nube está activa para tus personajes y archivos.",
    "Account services are unavailable. Chati-AI will continue in local mode.": "Las cuentas no están disponibles. Chati-AI seguirá en modo local.",
    "Your Chati-AI account keeps normal characters and cloud media synchronized across signed-in devices. Private Chat and Private Group always remain local and temporary.": "Tu cuenta de Chati-AI mantiene tus personajes y archivos sincronizados entre dispositivos. El chat privado y el grupo privado siempre son locales y temporales.",
    "Saved normally": "Guardado normal",
    "Not saved on this device": "No se guarda en este dispositivo",
    "Display name": "Nombre visible",
    "Profile media URL": "URL de la foto de perfil",
    "Choose from gallery": "Elegir de la galería",
    "Save Profile": "Guardar perfil",
    "Accounts": "Cuentas",
    "Security": "Seguridad",
    "Appearance": "Apariencia",

    // Chati assistant
    "Your character-building assistant": "Tu asistente para crear personajes",
    "New conversation": "Nueva conversación",
    "Ask Chati…": "Pregúntale a Chati…",
    "Hi! I'm Chati": "¡Hola! Soy Chati",
    "Tell me a character from any anime, game, movie or book and I'll research it and build the bot for you. You can also send me photos, or ask me how the app works.": "Dime un personaje de cualquier anime, juego, película o libro y lo investigo y te armo el bot. También puedes mandarme fotos o preguntarme cómo funciona la app.",
    "Make me a character from an anime or game": "Hazme un personaje de un anime o juego",
    "Help me create an original character": "Ayúdame a crear un personaje original",
    "How does the app work?": "¿Cómo funciona la app?",
    "Researching…": "Investigando…",
    "Thinking…": "Pensando…",
    "Sources": "Fuentes",
    "Character ready": "Personaje listo",
    "See details": "Ver detalles",
    "Profile picture": "Foto de perfil",
    "Chat background": "Fondo del chat",
    "None": "Ninguna",
    "Photo": "Foto",
    "Tip: send me a photo of the character to use it as the profile picture or background.": "Tip: mándame una foto del personaje para usarla de perfil o de fondo.",
    "Create & chat": "Crear y chatear",
    "Create & edit": "Crear y editar",
    "Created": "Creado",
    "Open chat": "Abrir chat",
    "Done! I created": "¡Listo! Creé a",
    "You can adjust anything in the editor.": "Puedes ajustar lo que quieras en el editor.",
    "Have fun chatting!": "¡Que te diviertas chateando!",
    "Web research: on": "Investigar en la web: activado",
    "Web research: off": "Investigar en la web: desactivado",
    "Open Chati, your assistant": "Abrir a Chati, tu asistente",
    "Chati couldn't answer right now. Please try again.": "Chati no pudo responder ahora. Inténtalo de nuevo."
  };

  // Interface strings that include a name or number.
  const ES_PATTERNS = [
    [/^Start a new conversation with (.+)\.$/, "Empieza una conversación nueva con $1."],
    [/^Clear all messages and memory from (.*)$/, "Borrar todos los mensajes y la memoria de $1"],
    [/^Delete character "(.+)" permanently\?/, "¿Eliminar a «$1» para siempre?"],
    [/^Delete group "(.+)" permanently\?/, "¿Eliminar el grupo «$1» para siempre?"],
    [/^Group chat with (.+)$/, "Chat grupal con $1"],
    [/^Rewind to this message\? (\d+) later messages? will be removed\.$/, "¿Regresar a este mensaje? Se quitarán $1 mensajes posteriores."],
    [/^(\d+) selected$/, "$1 seleccionados"]
  ];

  function detectLanguage() {
    let choice = "auto";
    try {
      choice = localStorage.getItem(STORAGE_KEY) || "auto";
    } catch (_) {}
    if (choice === "es" || choice === "en") return choice;
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language || "en"];
    return languages.some(language => /^es\b/i.test(language)) ? "es" : "en";
  }

  const lang = detectLanguage();

  function translate(text) {
    if (lang !== "es" || typeof text !== "string") return text;
    const trimmed = text.trim();
    if (!trimmed) return text;
    const hit = ES[trimmed];
    if (hit !== undefined) return text.replace(trimmed, hit);
    for (const [pattern, replacement] of ES_PATTERNS) {
      if (pattern.test(trimmed)) return text.replace(trimmed, trimmed.replace(pattern, replacement));
    }
    return text;
  }

  // User content lives here; never translate inside it.
  const SKIP = "#messages, .message, textarea, [contenteditable='true'], .character-info, .v8-explore, .v8-chati-panel";
  const ATTRIBUTES = ["placeholder", "title", "aria-label", "data-tooltip"];

  function translateElementAttributes(element) {
    for (const name of ATTRIBUTES) {
      const value = element.getAttribute?.(name);
      if (value) {
        const next = translate(value);
        if (next !== value) element.setAttribute(name, next);
      }
    }
  }

  function translateTree(root) {
    if (!root || lang !== "es") return;
    if (root.nodeType === Node.TEXT_NODE) {
      const parent = root.parentElement;
      if (!parent || (parent.closest(SKIP) && !parent.closest(".chat-empty"))) return;
      const next = translate(root.nodeValue);
      if (next !== root.nodeValue) root.nodeValue = next;
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    // Chat messages never need a look; other skipped areas are checked per
    // text node below.
    if (
      root.closest("#messages, .message, script, style, svg") &&
      !root.closest(".chat-empty") &&
      !root.querySelector?.(".chat-empty")
    ) return;

    translateElementAttributes(root);
    root.querySelectorAll?.("[placeholder], [title], [aria-label], [data-tooltip]").forEach(translateElementAttributes);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest("script, style")) continue;
      // The empty-chat hint lives inside #messages but is interface text.
      if (parent.closest(SKIP) && !parent.closest(".chat-empty")) continue;
      const next = translate(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    }
  }

  function watch() {
    let pending = new Set();
    let scheduled = false;

    const flush = () => {
      scheduled = false;
      const nodes = pending;
      pending = new Set();
      nodes.forEach(translateTree);
    };

    new MutationObserver(records => {
      for (const record of records) {
        if (record.type === "childList") {
          record.addedNodes.forEach(node => pending.add(node));
        } else if (record.type === "characterData") {
          pending.add(record.target);
        } else if (record.type === "attributes") {
          translateElementAttributes(record.target);
        }
      }
      if (!scheduled && pending.size) {
        scheduled = true;
        queueMicrotask(flush);
      }
    }).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRIBUTES
    });
  }

  // Native dialogs used by the app (confirm/alert/prompt).
  function wrapDialogs() {
    if (lang !== "es") return;
    const wrap = name => {
      const original = window[name].bind(window);
      window[name] = (message, ...rest) => original(translate(String(message ?? "")), ...rest);
    };
    ["alert", "confirm", "prompt"].forEach(wrap);
  }

  // Language picker in Settings (Automatic / Español / English).
  function addLanguageSetting() {
    const anchor = document.querySelector(".mature-content-row") ||
      document.querySelector(".settings-boundary-note");
    if (!anchor || document.getElementById("v8LanguageSelect")) return;

    let current = "auto";
    try {
      current = localStorage.getItem(STORAGE_KEY) || "auto";
    } catch (_) {}

    const row = document.createElement("label");
    row.className = "mature-content-row v8-language-row";
    row.innerHTML =
      '<div class="mature-content-copy"><strong>' + translate("Language") + '</strong></div>' +
      '<select id="v8LanguageSelect" class="v8-language-select">' +
        '<option value="auto">' + translate("Automatic") + '</option>' +
        '<option value="es">Español</option>' +
        '<option value="en">English</option>' +
      '</select>';
    anchor.insertAdjacentElement("afterend", row);

    const select = row.querySelector("select");
    select.value = current;
    select.addEventListener("change", () => {
      try {
        localStorage.setItem(STORAGE_KEY, select.value);
      } catch (_) {}
      location.reload();
    });
  }

  window.ChatiI18n = Object.freeze({ lang, t: translate });

  function initialize() {
    document.documentElement.lang = lang;
    wrapDialogs();
    addLanguageSetting();
    translateTree(document.body);
    if (lang === "es") watch();
    window.dispatchEvent(new CustomEvent("chati:languagechange", { detail: { lang } }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
