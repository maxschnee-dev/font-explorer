# Font Explorer

Simple project to explore all Google fonts!

## Commands

- `npm install` — install dependencies
- `npm run dev` — start the dev server
- `npm run build` — type-check and build to `dist/`
- `npm run preview` — serve the built site
- `npm run update-fonts` — refresh `fonts.json` from the Google Fonts catalog

## GitHub Pages

In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
The deployment workflow builds and publishes the site on every push to `main`.
You can also run it manually from the **Actions** tab.

The site is hosted at https://maxschnee-dev.github.io/font-explorer/.
Vite's base path is set to `/font-explorer/` so assets load at this address.
