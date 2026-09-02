/**
 * Place Help & Learning copy on the keys the workspace actually reads
 * (`memorisation.helpLearning`) and replace leaked FR/ES strings.
 */
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.resolve('resources/js/locales')

function setAt(obj, keyPath, value) {
  const parts = keyPath.split('.')
  let cursor = obj
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object') cursor[parts[i]] = {}
    cursor = cursor[parts[i]]
  }
  cursor[parts[parts.length - 1]] = value
}

const FR = {
  title: 'Aide et apprentissage',
  subtitle: 'De courts guides pour une mémorisation du Coran calme et régulière.',
  bestFor: 'Idéal pour',
  sections: {
    tajweed: {
      title: 'Couleurs du tajweed',
      description: 'Lorsque le tajweed est activé, Mutqin colore les lettres pour que vous remarquiez les schémas de prononciation en écoutant et en répétant.',
      bestFor: 'Ceux qui veulent affiner la prononciation en mémorisant, sans se presser.',
      legendTitle: 'Ce que signifie chaque couleur',
      legendIntro: 'Servez-vous de cette légende en écoutant et en répétant. C’est un guide, pas un remplacement d’un professeur.',
      colors: {
        gray: { label: 'Lettres silencieuses / de liaison', description: 'Hamzat al-wasl et lettres silencieuses qui ne se prononcent pas.' },
        green: { label: 'Ghunnah / Idgham avec ghunnah', description: 'Nasalisation et jonction avec un son nasal.' },
        purple: { label: 'Ikhfa / Idgham sans ghunnah', description: 'Noon caché et jonction non nasale.' },
        orange: { label: 'Qalqalah', description: 'Écho d’arrêt sur ق ط ب ج د.' },
        red: { label: 'Madd (allongement)', description: 'Allongement normal, obligatoire et nécessaire.' },
        blue: { label: 'Idgham shafawi', description: 'Fusion labiale avec م.' },
      },
    },
    srs: {
      title: 'Planification des révisions',
      description: 'Revenez aux ayahs mémorisées avant qu’elles ne s’estompent. Celles qui demandent plus de soin reviennent plus tôt.',
      bestFor: 'Garder solide, dans le temps, ce qui a déjà été mémorisé.',
    },
    techniques: {
      title: 'Pratique guidée',
      description: 'Écoutez, suivez et répétez à un rythme confortable. Choisissez la méthode qui vous aide à rester régulier.',
      bestFor: 'Ceux qui construisent un rythme quotidien calme.',
      details: {
        repetition: { label: 'Répétition', text: 'Répétez le même verset quelques fois avant de continuer.' },
        linking: { label: 'Liaison', text: 'Reliez chaque verset au suivant pour fluidifier le passage.' },
        cumulative: { label: 'Cumul', text: 'Ajoutez de nouveaux versets tout en révisant doucement les précédents.' },
      },
    },
    layouts: {
      title: 'Mises en page de lecture',
      description: 'Passez des cartes empilées à une page de style Mushaf selon ce qui est le plus facile à suivre.',
      bestFor: 'Choisir une vue de lecture qui reste confortable.',
      details: {
        stacked: { label: 'Vue empilée', text: 'Montre chaque ayah clairement, l’une après l’autre — pratique sur petit écran.' },
        mushaf: { label: 'Vue Mushaf', text: 'Montre les ayahs dans un style inspiré de la page du Mushaf.' },
      },
    },
    aiRecitation: {
      title: 'Vérification de récitation',
      description: 'Récitez de mémoire et laissez Mutqin suivre votre progression. Voyez quels mots demandent un peu plus d’attention.',
      bestFor: 'Ceux qui veulent un retour doux après avoir pratiqué à voix haute.',
    },
    talqinMode: {
      title: 'Mode talqin',
      description: 'Écoutez, faites une pause, répétez et allongez à un rythme régulier pour rester concentré sur les ayahs.',
      bestFor: 'Ceux qui renforcent la rétention par l’écoute guidée et la répétition.',
      workflowTitle: 'Comment se déroule un tour de talqin',
      workflowIntro: 'Chaque tour suit les mêmes trois étapes, pour que vous sachiez toujours ce qui vient.',
      workflowListen: 'Écouter.',
      workflowListenText: 'Le récitateur lit une courte portion pendant que vous suivez.',
      workflowPause: 'Répéter.',
      workflowPauseText: 'La lecture se met en pause pour que vous répétiez la même portion à voix haute.',
      workflowExtend: 'Allonger.',
      workflowExtendText: 'Quand c’est posé, la portion s’allonge pour la relier à ce qui précède.',
    },
    manualAssessment: {
      title: 'Auto-évaluation',
      description: 'Après une session, notez votre aisance pour que l’étape suivante reste utile.',
      bestFor: 'Ceux qui préfèrent une réflexion simple, par eux-mêmes.',
    },
  },
}

const ES = {
  title: 'Ayuda y aprendizaje',
  subtitle: 'Guías breves para una memorización del Corán serena y constante.',
  bestFor: 'Ideal para',
  sections: {
    tajweed: {
      title: 'Colores del tajweed',
      description: 'Cuando el tajweed está activo, Mutqin colorea las letras para que notes los patrones de pronunciación mientras escuchas y repites.',
      bestFor: 'Quienes quieren mejorar la pronunciación con calma mientras memorizan.',
      legendTitle: 'Qué significa cada color',
      legendIntro: 'Usa esta leyenda mientras escuchas y repites. Es una guía, no sustituye a un profesor.',
      colors: {
        gray: { label: 'Letras silenciosas / de enlace', description: 'Hamzat al-wasl y letras silenciosas que no se pronuncian.' },
        green: { label: 'Ghunnah / Idgham con ghunnah', description: 'Nasalización y unión con sonido nasal.' },
        purple: { label: 'Ikhfa / Idgham sin ghunnah', description: 'Noon oculta y unión no nasal.' },
        orange: { label: 'Qalqalah', description: 'Eco de parada en ق ط ب ج د.' },
        red: { label: 'Madd (alargamiento)', description: 'Alargamiento normal, obligatorio y necesario.' },
        blue: { label: 'Idgham shafawi', description: 'Fusión labial con م.' },
      },
    },
    srs: {
      title: 'Planificación de revisiones',
      description: 'Vuelve a las ayahs memorizadas antes de que empiecen a desvanecerse. Las que necesitan más cuidado reaparecen antes.',
      bestFor: 'Mantener fuerte, con el tiempo, lo ya memorizado.',
    },
    techniques: {
      title: 'Práctica guiada',
      description: 'Escucha, sigue y repite a un ritmo cómodo. Elige el método que te ayuda a mantenerte constante.',
      bestFor: 'Quienes construyen un ritmo diario sereno.',
      details: {
        repetition: { label: 'Repetición', text: 'Repite el mismo versículo unas veces antes de seguir.' },
        linking: { label: 'Enlace', text: 'Une cada versículo con el siguiente para mejorar el fluir.' },
        cumulative: { label: 'Acumulativa', text: 'Añade versículos nuevos mientras revisas con suavidad los anteriores.' },
      },
    },
    layouts: {
      title: 'Diseños de lectura',
      description: 'Cambia entre tarjetas apiladas y una página al estilo Mushaf según lo que te resulte más fácil de seguir.',
      bestFor: 'Elegir una vista de lectura que siga siendo cómoda.',
      details: {
        stacked: { label: 'Vista apilada', text: 'Muestra cada ayah con claridad, una tras otra: útil en pantallas pequeñas.' },
        mushaf: { label: 'Vista Mushaf', text: 'Muestra las ayahs en un estilo inspirado en la página del Mushaf.' },
      },
    },
    aiRecitation: {
      title: 'Comprobación de recitación',
      description: 'Recita de memoria y deja que Mutqin siga tu progreso. Verás qué palabras piden un poco más de atención.',
      bestFor: 'Quienes quieren una devolución suave después de practicar en voz alta.',
    },
    talqinMode: {
      title: 'Modo talqin',
      description: 'Escucha, pausa, repite y alarga a un ritmo constante para centrarte en las ayahs.',
      bestFor: 'Quienes refuerzan la retención con escucha guiada y repetición.',
      workflowTitle: 'Cómo fluye un turno de talqin',
      workflowIntro: 'Cada turno sigue los mismos tres pasos, para que siempre sepas qué viene.',
      workflowListen: 'Escuchar.',
      workflowListenText: 'El recitador lee una porción breve mientras tú sigues.',
      workflowPause: 'Repetir.',
      workflowPauseText: 'La reproducción se pausa para que repitas la misma porción en voz alta.',
      workflowExtend: 'Alargar.',
      workflowExtendText: 'Cuando esté asentado, la porción crece para unirla con lo anterior.',
    },
    manualAssessment: {
      title: 'Autoevaluación',
      description: 'Después de una sesión, anota cómo de seguro te sentiste para que el siguiente paso siga siendo útil.',
      bestFor: 'Quienes prefieren una reflexión sencilla, por su cuenta.',
    },
  },
}

for (const locale of ['en', 'fr', 'es', 'ar', 'id', 'tr', 'ur']) {
  const file = path.join(DIR, `${locale}.json`)
  const tree = JSON.parse(fs.readFileSync(file, 'utf8'))
  const source = locale === 'fr' ? FR : locale === 'es' ? ES : tree.hifzPlan?.helpLearning
  if (!source) continue
  if (locale === 'fr' || locale === 'es') {
    setAt(tree, 'hifzPlan.helpLearning', source)
  }
  setAt(tree, 'memorisation.helpLearning', locale === 'fr' ? FR : locale === 'es' ? ES : source)
  fs.writeFileSync(file, `${JSON.stringify(tree, null, 2)}\n`)
}

console.log('Copied helpLearning onto memorisation.helpLearning and refreshed FR/ES copy.')
