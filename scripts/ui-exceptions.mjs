// Existing registry files with low-level implementation needs, not a folder-wide escape hatch.
// pnpm ui:add does not grant exceptions automatically. Review new entries with their source/diff.
const uiFiles = (names) => new Set(names.map((name) => `shared/ui/${name}.tsx`))

export const primitiveImportFiles = uiFiles([
  'alert-dialog',
  'avatar',
  'badge',
  'breadcrumb',
  'button',
  'card', // CardTitle's Slot preserves semantic headings (docs/design/compositions.md).
  'checkbox',
  'dialog',
  'dropdown-menu',
  'label',
  'popover',
  'progress',
  'scroll-area',
  'select',
  'separator',
  'sheet',
  'sidebar',
  'stack', // Approved Slot composition, docs/adr/005-stack-layout.md.
  'switch',
  'tabs',
  'toggle',
  'toggle-group',
  'tooltip',
])
export const nativeControlFiles = uiFiles(['button', 'input', 'sidebar', 'textarea'])
export const inlineStyleFiles = uiFiles(['chart', 'progress', 'sidebar', 'sonner', 'toggle-group'])
export const styleElementFiles = uiFiles(['chart'])
