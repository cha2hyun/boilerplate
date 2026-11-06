import config from '../prettier.config.mjs'

// Markdown uses the same formatting options without installing the Tailwind app toolchain.
export default Object.fromEntries(
  Object.entries(config).filter(([key]) => key !== 'plugins' && !key.startsWith('tailwind')),
)
