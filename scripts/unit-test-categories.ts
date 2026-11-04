// Keep Vitest selection and the filesystem coverage guard on the same definitions.
export const unitTestFileGlob = '**/*.{test,spec}.{ts,tsx}'

export const unitTestCategories = [
  {
    name: 'foundations',
    include: [`src/shared/{api,config,lib}/${unitTestFileGlob}`],
  },
  {
    name: 'data',
    include: [`src/{entities,features}/${unitTestFileGlob}`],
  },
  {
    name: 'ui',
    include: [
      `src/{app,pages,widgets}/${unitTestFileGlob}`,
      `src/shared/{ui,hooks}/${unitTestFileGlob}`,
    ],
  },
]
