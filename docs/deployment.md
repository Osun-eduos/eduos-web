# Deployment

This repository holds two things that deploy separately:

| What | Folder | Build |
| --- | --- | --- |
| The web app | repository root | `npm run build` → `dist/` |
| The clickable prototype | `prototype/` | none (static HTML) |

## The web app

The web app needs [eduos-api](https://github.com/Osun-eduos/eduos-api) running somewhere it can reach.

### Same-site hosting

Sign-in keeps a refresh token in an httpOnly cookie with `SameSite=Strict`. Browsers only send it when the web app and the API are on the same site, for example:

- web at `https://eduos.example.gov.ng`, API at `https://api.eduos.example.gov.ng`; or
- web and API on one domain, with the API under `/api` (a reverse proxy or Cloudflare route).

`*.pages.dev` addresses are treated as separate sites, so for testing on `pages.dev` put the API behind the same `pages.dev` domain or use a custom domain for both.

### Build settings

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output folder | `dist` |
| Node version | 22 |
| `VITE_API_URL` | The API address, e.g. `https://api.eduos.example.gov.ng`. Leave unset if the API is at `/api` on the same domain. |

On the API side, set `WEB_ORIGIN` to the web app's address and keep `COOKIE_SECURE=true`.

### Cloudflare Pages

Connect the repository in **Workers & Pages → Create → Pages → Connect to Git**, choose `eduos-web`, and use the build settings above. `public/_redirects` makes deep links such as `/accounts` load the app.

## The prototype

The live demo at https://osun-eduos.pages.dev is the prototype.

**Manual upload:** zip the **contents** of `prototype/` (so `index.html` and `_headers` are at the top level of the zip), then in Cloudflare open the `osun-eduos` Pages project → **Create deployment** and upload the zip.

**Automatic:** `.github/workflows/deploy.yml` publishes `prototype/` on every push to `main` that changes it. It stays off until you add, in **Settings → Secrets and variables → Actions**:

- secret `CLOUDFLARE_API_TOKEN` (a token with **Cloudflare Pages: Edit**);
- secret `CLOUDFLARE_ACCOUNT_ID`;
- variable `CLOUDFLARE_PAGES_PROJECT` = `osun-eduos`.

## Restricting access

A `pages.dev` link is public. To limit who can open it, put the project behind **Cloudflare Access** (Zero Trust → Access → Applications) and allow specific email addresses or domains.

## Licence obligation

The project is licensed under the AGPL-3.0. If you deploy a **modified** version for others to use, you must offer them the corresponding source code, for example with a visible link to your public repository.
