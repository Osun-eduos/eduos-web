# Deploying the prototype

The prototype is static: everything is in `site/`. Any static web host works.

## Cloudflare Pages: dashboard upload

1. Zip the **contents** of `site/` so that `index.html` and `_headers` sit at the top level of the zip, not inside a folder.
2. In Cloudflare, open **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
3. Name the project (for example `osun-eduos`), upload the zip and choose **Deploy site**.

To update, open the project and choose **Create deployment**, then upload a new zip. The address stays the same.

## Cloudflare Pages: automatic deploys from GitHub

The workflow in `.github/workflows/deploy.yml` publishes `site/` to Cloudflare Pages on every push to `main`. It is skipped until you configure it:

1. In Cloudflare, create an API token with the **Cloudflare Pages: Edit** permission.
2. In the GitHub repository, open **Settings** → **Secrets and variables** → **Actions** and add:
   - secret `CLOUDFLARE_API_TOKEN`: the token;
   - secret `CLOUDFLARE_ACCOUNT_ID`: your Cloudflare account ID;
   - variable `CLOUDFLARE_PAGES_PROJECT`: the Pages project name, e.g. `osun-eduos`.
3. Push to `main`, or run the workflow manually from the **Actions** tab.

## GitHub Pages

Open **Settings** → **Pages**, set **Source** to **GitHub Actions**, and add the suggested **Static HTML** workflow. In that workflow, change the upload step's `path` from `.` to `site`. GitHub Pages ignores the `_headers` file.

## Restricting access

A `pages.dev` link is public. To limit the demo to named people, put the project behind **Cloudflare Access** (Zero Trust → Access → Applications) and allow specific email addresses or domains.

## Licence obligation

The project is licensed under the AGPL-3.0. If you deploy a **modified** version for others to use, you must offer them the corresponding source code, for example with a visible link to your public repository.
