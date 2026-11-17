# @lanona/web

Front-end Angular 19.2 do La Nona (NgModules, PrimeNG 19, Tailwind 4, Supabase). Setup, scripts e deploy estão no
[`README.md` da raiz](../../README.md). Padrões do front estão em [`PATTERNS.md`](./PATTERNS.md) e as regras gerais no `CLAUDE.md` da raiz.

```bash
npm start          # http://localhost:4200 (Supabase local: rode `npm run db:start` na raiz)
npm run build
npm run test:ci    # Karma headless
npm run e2e        # Playwright (sobe o ng serve na porta 4310)
```

Para gerar artefatos: `npx ng g c caminho/nome` (os schematics já usam `standalone: false` e `scss`).
