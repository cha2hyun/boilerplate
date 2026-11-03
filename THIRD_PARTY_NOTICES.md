# Third-party notices

## shadcn/ui

The components in `src/shared/ui/` and the mobile hook in `src/shared/hooks/use-mobile.ts` were generated from the shadcn/ui new-york/Radix registry and adapted for this repository. The theme is based on the official neutral tokens. Local adaptations are documented in [ADR 002](docs/adr/002-shadcn-registry-adaptations.md).

`src/app/providers/theme-provider.tsx` and `src/shared/lib/theme.ts` adapt the official [shadcn Vite dark-mode recipe](https://ui.shadcn.com/docs/dark-mode/vite); their local changes are documented in [ADR 003](docs/adr/003-vite-theme-provider.md).

- Source: [shadcn-ui/ui](https://github.com/shadcn-ui/ui)
- License: [upstream MIT license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md)
- Registry: [shadcn/ui](https://ui.shadcn.com/)

```text
MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Package dependencies retain their respective licenses. This notice preserves the license for vendored shadcn source; it does not select a license for the original application code in this repository.

## Pretendard

The default font uses the unmodified static dynamic subsets from the official `pretendard@1.3.9` package. Only Regular (400), Medium (500), and SemiBold (600) stylesheets are imported. Their Unicode ranges let the browser request the Korean, Latin, and other supported character slices it needs. Vite serves the font assets from the application build; the browser does not contact a font CDN.

- Source: [orioncactus/pretendard v1.3.9](https://github.com/orioncactus/pretendard/tree/v1.3.9)
- Copyright (c) 2021, Kil Hyung-jin, with Reserved Font Name Pretendard.
- License: SIL Open Font License 1.1. The unmodified copyright notice and full license are included in [public/fonts/pretendard/OFL.txt](public/fonts/pretendard/OFL.txt), which is copied into the deployed application at `/fonts/pretendard/OFL.txt`.
