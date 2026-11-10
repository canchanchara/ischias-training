/*
 * Übungskatalog für das Ischias-Training.
 *
 * Jede Übung enthält zwei Körperhaltungen (poses.a / poses.b) als 2D-Gelenkpunkte
 * in Seitenansicht. Die App animiert fließend zwischen beiden Haltungen, damit die
 * Bewegung klar erkennbar ist. Koordinatensystem: viewBox "0 25 260 155", Boden bei y≈170.
 *
 * Gelenke: head, neck, mid (Mitte Wirbelsäule), hip,
 *          elbowN/handN, kneeN/footN (zugewandte Seite, kräftig gezeichnet)
 *          elbowF/handF, kneeF/footF (abgewandte Seite, heller gezeichnet)
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Exercises = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const JOINTS = ['head', 'neck', 'mid', 'hip', 'elbowN', 'handN', 'elbowF', 'handF', 'kneeN', 'footN', 'kneeF', 'footF'];

  const CATEGORIES = {
    warmup: 'Aufwärmen',
    mobility: 'Mobilisation',
    nerve: 'Nervengleiten',
    stretch: 'Dehnung',
    strength: 'Kräftigung',
    cooldown: 'Entspannung',
  };

  const with_ = (base, over) => Object.assign({}, base, over || {});

  // Rückenlage, Beine angewinkelt (Füße auf dem Boden)
  const HOOK = {
    head: [40, 153], neck: [58, 160], mid: [88, 161], hip: [118, 160],
    elbowN: [86, 165], handN: [111, 166], elbowF: [84, 164], handF: [109, 165],
    kneeN: [155, 126], footN: [188, 166], kneeF: [151, 128], footF: [184, 166],
  };

  // Vierfüßlerstand
  const QUAD = {
    head: [78, 116], neck: [92, 124], mid: [125, 122], hip: [158, 124],
    elbowN: [92, 146], handN: [92, 168], elbowF: [97, 146], handF: [97, 168],
    kneeN: [158, 168], footN: [203, 168], kneeF: [163, 168], footF: [208, 168],
  };

  // Bauchlage, Stirn auf den Händen
  const PRONE = {
    head: [46, 157], neck: [64, 162], mid: [98, 163], hip: [132, 162],
    elbowN: [80, 167], handN: [54, 166], elbowF: [83, 167], handF: [57, 166],
    kneeN: [177, 164], footN: [222, 166], kneeF: [176, 165], footF: [220, 167],
  };

  // Sitzen auf der vorderen Stuhlhälfte
  const SEATED = {
    head: [128, 46], neck: [119, 60], mid: [120, 90], hip: [121, 119],
    elbowN: [128, 90], handN: [152, 110], elbowF: [124, 90], handF: [148, 110],
    kneeN: [166, 119], footN: [168, 165], kneeF: [162, 120], footF: [164, 165],
  };

  // Halbkniestand (vorderes Bein = zugewandt)
  const KNEEL = {
    head: [130, 47], neck: [130, 62], mid: [130, 93], hip: [130, 124],
    elbowN: [112, 100], handN: [128, 120], elbowF: [115, 100], handF: [131, 120],
    kneeN: [175, 124], footN: [182, 168], kneeF: [118, 168], footF: [76, 168],
  };

  const EXERCISES = [
    {
      id: 'atmung',
      name: 'Bauchatmung',
      categories: ['warmup', 'cooldown'],
      duration: 90,
      sides: false,
      cycle: 8,
      short: 'Entspannt Rücken und Nervensystem, senkt die Schmerzspannung.',
      steps: [
        'Lege dich auf den Rücken, Beine angewinkelt, Füße hüftbreit auf dem Boden.',
        'Lege beide Hände locker auf den Bauch.',
        'Atme 4 Sekunden durch die Nase ein – der Bauch hebt sich.',
        'Atme 4–6 Sekunden langsam durch den Mund aus – der Bauch senkt sich.',
      ],
      tip: 'Schultern und Kiefer bewusst locker lassen.',
      caution: '',
      poses: {
        a: with_(HOOK, { elbowN: [80, 150], handN: [98, 155], elbowF: [82, 150], handF: [100, 155] }),
        b: with_(HOOK, { mid: [88, 151], elbowN: [80, 146], handN: [98, 146], elbowF: [82, 146], handF: [100, 146] }),
      },
    },
    {
      id: 'beckenkippen',
      name: 'Beckenkippen',
      categories: ['warmup'],
      duration: 60,
      sides: false,
      cycle: 5,
      short: 'Sanfte Bewegung der Lendenwirbelsäule, aktiviert die tiefe Bauchmuskulatur.',
      steps: [
        'Rückenlage, Beine angewinkelt, Arme neben dem Körper.',
        'Spanne den Bauch leicht an und drücke den unteren Rücken sanft in die Matte.',
        '2 Sekunden halten, dann wieder lösen.',
        'Ruhig weiteratmen, die Bewegung bleibt klein.',
      ],
      tip: 'Stell dir vor, du ziehst den Bauchnabel sanft Richtung Wirbelsäule.',
      caution: '',
      poses: {
        a: with_(HOOK),
        b: with_(HOOK, { mid: [88, 165], hip: [118, 157], kneeN: [157, 123], kneeF: [153, 125] }),
      },
    },
    {
      id: 'katze-kuh',
      name: 'Katze-Kuh',
      categories: ['warmup', 'mobility'],
      duration: 60,
      sides: false,
      cycle: 7,
      short: 'Mobilisiert die gesamte Wirbelsäule im Wechsel aus Rundrücken und Streckung.',
      steps: [
        'Vierfüßlerstand: Hände unter den Schultern, Knie unter den Hüften.',
        'Ausatmen: Rücken rund machen wie eine Katze, Kinn zur Brust.',
        'Einatmen: Rücken langsam leicht durchhängen lassen, Blick nach vorn.',
        'Nur im schmerzfreien Bereich bewegen.',
      ],
      tip: 'Die Bewegung kommt aus dem Becken – langsam Wirbel für Wirbel.',
      caution: '',
      poses: {
        a: with_(QUAD, { mid: [125, 104], head: [84, 138] }),
        b: with_(QUAD, { mid: [125, 136], head: [82, 109] }),
      },
    },
    {
      id: 'knie-pendel',
      name: 'Knie-Pendel (liegende Rotation)',
      categories: ['warmup', 'mobility', 'cooldown'],
      duration: 60,
      sides: false,
      cycle: 7,
      short: 'Lockert den unteren Rücken durch sanfte Drehung.',
      steps: [
        'Rückenlage, Füße auf dem Boden, Arme seitlich ausgestreckt.',
        'Beide Knie langsam zu einer Seite sinken lassen – die Schultern bleiben am Boden.',
        'Zurück zur Mitte und zur anderen Seite.',
        'Nur so weit, wie es angenehm ist.',
      ],
      tip: 'Mit der Ausatmung absinken, mit der Einatmung zurück.',
      caution: '',
      poses: {
        a: with_(HOOK),
        b: with_(HOOK, { kneeN: [148, 150], footN: [186, 166], kneeF: [146, 152], footF: [184, 167] }),
      },
    },
    {
      id: 'knie-brust',
      name: 'Knie zur Brust (einseitig)',
      categories: ['mobility'],
      duration: 40,
      sides: true,
      cycle: 8,
      short: 'Dehnt den unteren Rücken und das Gesäß sanft.',
      steps: [
        'Rückenlage, beide Beine angewinkelt.',
        'Ein Knie mit beiden Händen sanft Richtung Brust ziehen.',
        'Ca. 5 Sekunden halten, dann langsam lösen und wiederholen.',
        'Der Kopf bleibt entspannt auf der Matte.',
      ],
      tip: 'Hände hinter das Knie legen, wenn Druck auf das Knie unangenehm ist.',
      caution: '',
      poses: {
        a: with_(HOOK),
        b: with_(HOOK, {
          kneeN: [104, 116], footN: [142, 124],
          elbowN: [80, 140], handN: [103, 113], elbowF: [82, 140], handF: [105, 115],
        }),
      },
    },
    {
      id: 'beide-knie',
      name: 'Beide Knie zur Brust',
      categories: ['mobility', 'cooldown'],
      duration: 60,
      sides: false,
      cycle: 9,
      short: 'Entlastet die Lendenwirbelsäule und öffnet die Zwischenwirbelräume.',
      steps: [
        'Rückenlage, Beine angewinkelt.',
        'Beide Knie nacheinander zur Brust holen und mit den Händen umfassen.',
        'Sanft heranziehen, ruhig atmen, leicht hin- und herschaukeln ist erlaubt.',
        'Füße nacheinander wieder abstellen.',
      ],
      tip: 'Beim Ausatmen die Knie ein kleines Stück näher holen.',
      caution: 'Weglassen, wenn dabei die Schmerzen ins Bein zunehmen.',
      poses: {
        a: with_(HOOK),
        b: with_(HOOK, {
          kneeN: [104, 116], footN: [142, 124], kneeF: [101, 118], footF: [139, 127],
          elbowN: [80, 140], handN: [103, 113], elbowF: [82, 140], handF: [105, 115],
        }),
      },
    },
    {
      id: 'sphinx',
      name: 'Sphinx (Bauchlage auf Unterarmen)',
      categories: ['mobility'],
      duration: 60,
      sides: false,
      cycle: 9,
      short: 'Sanfte Streckung nach McKenzie – kann Beinschmerzen „zentralisieren“.',
      steps: [
        'Lege dich auf den Bauch, Stirn auf den Händen.',
        'Stütze dich langsam auf die Unterarme, Ellbogen unter den Schultern.',
        'Becken bleibt am Boden, Gesäß und Rücken entspannt. Ruhig atmen.',
        'Langsam wieder ablegen.',
      ],
      tip: 'Gutes Zeichen: Der Schmerz wandert aus dem Bein Richtung Rücken.',
      caution: 'Abbrechen, wenn die Schmerzen weiter ins Bein ausstrahlen.',
      poses: {
        a: with_(PRONE),
        b: with_(PRONE, {
          head: [56, 113], neck: [68, 124], mid: [100, 150],
          elbowN: [70, 167], handN: [40, 167], elbowF: [74, 167], handF: [44, 167],
        }),
      },
    },
    {
      id: 'kindhaltung',
      name: 'Kindhaltung',
      categories: ['mobility', 'stretch', 'cooldown'],
      duration: 60,
      sides: false,
      cycle: 10,
      short: 'Dehnt den gesamten Rücken und beruhigt.',
      steps: [
        'Start im Vierfüßlerstand.',
        'Gesäß langsam Richtung Fersen schieben.',
        'Arme lang nach vorn, Stirn auf der Matte ablegen.',
        'Tief in den unteren Rücken atmen.',
      ],
      tip: 'Ein Kissen zwischen Gesäß und Fersen macht die Position bequemer.',
      caution: '',
      poses: {
        a: with_(QUAD),
        b: with_(QUAD, {
          head: [96, 160], neck: [112, 156], mid: [146, 147], hip: [178, 146],
          elbowN: [80, 166], handN: [52, 167], elbowF: [83, 166], handF: [55, 168],
          kneeN: [140, 166], footN: [186, 168], kneeF: [143, 167], footF: [189, 169],
        }),
      },
    },
    {
      id: 'nerv-sitzend',
      name: 'Ischias-Nervengleiten im Sitzen',
      categories: ['nerve'],
      duration: 45,
      sides: true,
      cycle: 4,
      prop: 'chair',
      short: 'Bringt den Ischiasnerv sanft ins Gleiten, ohne ihn zu dehnen.',
      steps: [
        'Sitze aufrecht auf der vorderen Stuhlhälfte.',
        'Strecke ein Knie, ziehe die Fußspitze zu dir und hebe gleichzeitig den Blick.',
        'Beuge das Knie wieder und senke dabei das Kinn Richtung Brust.',
        'Fließend hin und her bewegen, nicht halten.',
      ],
      tip: 'Es darf höchstens leicht ziehen – wie ein „Faden“, der hin und her gleitet.',
      caution: 'Kein Dehnen! Kribbeln oder Schmerz dürfen nicht zunehmen und müssen nach der Bewegung sofort abklingen.',
      poses: {
        a: with_(SEATED),
        b: with_(SEATED, { head: [111, 45], footN: [208, 103] }),
      },
    },
    {
      id: 'nerv-liegend',
      name: 'Nervengleiten in Rückenlage',
      categories: ['nerve'],
      duration: 45,
      sides: true,
      cycle: 4,
      short: 'Mobilisiert den Ischiasnerv im Liegen – rückenschonend.',
      steps: [
        'Rückenlage. Ein Bein anwinkeln und mit beiden Händen hinter dem Oberschenkel halten.',
        'Knie langsam strecken, bis ein leichtes Ziehen kommt – sofort wieder beugen.',
        'Rhythmisch hin und her gleiten, nicht halten.',
        'Das andere Bein bleibt entspannt aufgestellt.',
      ],
      tip: 'Zusätzlich die Fußspitze beim Strecken anziehen, beim Beugen lösen.',
      caution: 'Nicht in den Schmerz hineinstrecken. Bei zunehmendem Kribbeln kleinere Bewegungen.',
      poses: {
        a: with_(HOOK, {
          kneeN: [128, 116], footN: [165, 134],
          elbowN: [90, 140], handN: [122, 132], elbowF: [92, 140], handF: [124, 132],
        }),
        b: with_(HOOK, {
          kneeN: [128, 116], footN: [138, 72],
          elbowN: [90, 140], handN: [122, 132], elbowF: [92, 140], handF: [124, 132],
        }),
      },
    },
    {
      id: 'piriformis',
      name: 'Piriformis-Dehnung (Figur 4)',
      categories: ['stretch'],
      duration: 40,
      sides: true,
      cycle: 10,
      short: 'Entspannt den Piriformis-Muskel, der auf den Ischiasnerv drücken kann.',
      steps: [
        'Rückenlage, beide Füße auf dem Boden.',
        'Lege den Knöchel des einen Beins auf das Knie des anderen Beins.',
        'Fasse hinter den Oberschenkel des unteren Beins und ziehe es sanft zur Brust.',
        'Dehnung im Gesäß spüren und ruhig atmen.',
      ],
      tip: 'Das obere Knie sanft nach außen sinken lassen.',
      caution: '',
      poses: {
        a: with_(HOOK, { kneeN: [138, 118], footN: [150, 125] }),
        b: with_(HOOK, {
          kneeF: [113, 117], footF: [148, 124], kneeN: [136, 121], footN: [116, 118],
          elbowN: [84, 138], handN: [110, 122], elbowF: [86, 138], handF: [112, 122],
        }),
      },
    },
    {
      id: 'hueftbeuger',
      name: 'Hüftbeuger-Dehnung im Halbkniestand',
      categories: ['stretch'],
      duration: 40,
      sides: true,
      cycle: 10,
      short: 'Ein verkürzter Hüftbeuger zieht ins Hohlkreuz – das entlastet den Rücken.',
      steps: [
        'Knie dich auf ein Knie (Kissen unterlegen), der andere Fuß steht vorne.',
        'Bauch leicht anspannen und das Becken aufrichten.',
        'Hüfte langsam nach vorn schieben, bis es vorn an der Leiste zieht.',
        'Der Oberkörper bleibt aufrecht – kein Hohlkreuz.',
      ],
      tip: 'Zum Festhalten eine Hand an Stuhl oder Wand.',
      caution: '',
      poses: {
        a: with_(KNEEL),
        b: with_(KNEEL, {
          head: [142, 53], neck: [142, 68], mid: [144, 99], hip: [146, 130],
          elbowN: [126, 104], handN: [144, 124], elbowF: [129, 104], handF: [147, 124],
          kneeN: [190, 124],
        }),
      },
    },
    {
      id: 'bruecke',
      name: 'Beckenheben (Brücke)',
      categories: ['strength'],
      duration: 45,
      sides: false,
      cycle: 6,
      short: 'Kräftigt Gesäß und Rückenstrecker und stabilisiert das Becken.',
      steps: [
        'Rückenlage, Füße hüftbreit aufgestellt, Arme neben dem Körper.',
        'Bauch und Gesäß anspannen, Becken langsam anheben, bis Knie, Hüfte und Schultern eine Linie bilden.',
        '2 Sekunden halten.',
        'Langsam Wirbel für Wirbel wieder ablegen.',
      ],
      tip: 'Druck über die Fersen in den Boden geben.',
      caution: 'Nicht ins Hohlkreuz drücken.',
      poses: {
        a: with_(HOOK),
        b: with_(HOOK, {
          hip: [116, 131], mid: [86, 148],
          kneeN: [160, 118], footN: [186, 166], kneeF: [156, 120], footF: [182, 166],
        }),
      },
    },
    {
      id: 'bird-dog',
      name: 'Vierfüßler-Diagonale (Bird-Dog)',
      categories: ['strength'],
      duration: 30,
      sides: true,
      cycle: 6,
      short: 'Trainiert die tiefe Rumpfstabilität ohne Belastung der Bandscheiben.',
      steps: [
        'Vierfüßlerstand, Rücken gerade, Blick zum Boden.',
        'Strecke einen Arm nach vorn und das gegenüberliegende Bein nach hinten.',
        'Becken bleibt waagerecht – kurz halten, dann zurück.',
        'Langsam und kontrolliert wiederholen.',
      ],
      tip: 'Stell dir ein Wasserglas auf deinem unteren Rücken vor.',
      caution: '',
      poses: {
        a: with_(QUAD),
        b: with_(QUAD, {
          head: [79, 115],
          elbowN: [66, 120], handN: [38, 116],
          kneeF: [201, 128], footF: [246, 124],
        }),
      },
    },
    {
      id: 'dead-bug',
      name: 'Toter Käfer (Dead Bug)',
      categories: ['strength'],
      duration: 30,
      sides: true,
      cycle: 6,
      short: 'Kräftigt die Bauchmuskulatur bei stabilem, geschütztem Rücken.',
      steps: [
        'Rückenlage, Arme zur Decke, Knie im 90°-Winkel angehoben (Tischposition).',
        'Unteren Rücken sanft in die Matte drücken.',
        'Ausatmen: Einen Arm nach hinten und das gegenüberliegende Bein lang machen.',
        'Zurück zur Mitte und langsam wiederholen.',
      ],
      tip: 'Je weiter weg das Bein vom Boden bleibt, desto leichter.',
      caution: 'Der Rücken darf nicht ins Hohlkreuz gehen. Bei Schmerzen das Bein weniger weit strecken.',
      poses: {
        a: with_(HOOK, {
          kneeN: [120, 116], footN: [164, 116], kneeF: [123, 118], footF: [167, 118],
          elbowN: [60, 133], handN: [62, 105], elbowF: [64, 133], handF: [66, 105],
        }),
        b: with_(HOOK, {
          kneeN: [120, 116], footN: [164, 116], kneeF: [161, 138], footF: [206, 146],
          elbowN: [34, 152], handN: [10, 158], elbowF: [64, 133], handF: [66, 105],
        }),
      },
    },
  ];

  return { JOINTS, CATEGORIES, EXERCISES };
});
