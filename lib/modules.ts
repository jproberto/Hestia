export const MODULES = {
  hestia: {
    key: 'hestia',
    name: 'Hestia',
    mascot: '/mascots/hestia.png',
    color: '#EC5223',
  },
  pluto: {
    key: 'pluto',
    name: 'Pluto',
    mascot: '/mascots/pluto.png',
    color: '#35472D',
  },
  milon: {
    key: 'milon',
    name: 'Mílon',
    mascot: '/mascots/milon.png',
    color: '#B7602B',
  },

} as const;

export type ModuleKey = keyof typeof MODULES;
export type ModuleConfig = typeof MODULES[ModuleKey];