# Cajun Cards & Collectibles GitHub Pages Webapp

Static subscription-first webapp for GitHub Pages.

## What It Does

- Runs on `github.io` as plain static files.
- Presents three TCG-shop-style membership subscriptions.
- Redirects subscription signups to Square checkout links.
- Keeps Cajun Cards & Collectibles branding light, ornate, and logo-friendly.
- Includes a hidden `admin.html` helper for previewing and exporting config changes after login.

## Add Square Links

Edit `config/site.json` and paste each Square checkout URL into the matching `squareUrl` field:

```json
{
  "id": "lagniappe-club",
  "squareUrl": "https://square.link/u/your-link"
}
```

Commit and push the file to the GitHub Pages repository after editing.

## Deploy To GitHub Pages

Use a repository named:

```text
cajunghost.github.io
```

Place these files at the repository root, then enable Pages from the default branch root. The public URL will be:

```text
https://cajunghost.github.io/
```

## Admin Helper

Open `/admin.html` directly. It is not linked from the public site.

Default helper login:

- Username: `CajunGamers`
- Password: `CajunGamers!2026#BayouVault`

The helper lets you paste/edit Square links or JSON, preview it locally in the browser, and export a replacement `site.json`. Because GitHub Pages is static, saving permanent site-wide changes still requires committing the updated `config/site.json`.

The admin helper also has a Discord Drop Notification form. Paste the Discord announcement text and message/channel link there, preview it, then export and commit `site.json` to publish the notice.

For Square links, the admin helper can also publish directly to GitHub from the browser. Paste a GitHub token with Contents read/write for `cajunghost/cajuncards`, update the Square links, then click `Publish Square links permanently`.

This login hides the helper UI from normal visitors, but it is still client-side protection because GitHub Pages is static. Do not put private secrets in this repository.
