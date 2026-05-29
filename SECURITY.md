# Security model

## Architecture

Cajun Cards & Collectibles is a **fully static site** hosted on GitHub Pages.
There is no server-side code, no database, and no backend API.
All dynamic configuration is stored in JSON files in this repository and served
directly by GitHub Pages' CDN.

## Admin authentication

The admin panel (`admin.html`) uses **client-side SHA-256 password hashing**.

- The password hash is stored in `config/site.json` and is publicly readable.
- An attacker who can read the hash could attempt an offline brute-force attack
  against the password.
- **Mitigation:** use a long, random admin password (20+ characters). The SHA-256
  hash alone does not reveal the password.

## GitHub publish token

The admin panel requires a **fine-grained GitHub personal access token** with
`Contents: read & write` permission for this repository in order to publish
configuration changes.

- The token is stored in `sessionStorage` only — it is never written to
  `localStorage`, never sent to any server other than `api.github.com`, and is
  cleared when the browser tab is closed.
- **Minimum scope:** issue a token scoped to this single repository only.
- **Rotation:** rotate the token immediately if you suspect it was exposed.

## Content Security Policy

All public-facing HTML pages include a `Content-Security-Policy` meta tag that:

- Restricts scripts to `'self'` (no inline scripts, no CDN scripts).
- Restricts styles to `'self'` and Google Fonts.
- Restricts images to `'self'`, data URIs, and the two card-image APIs.
- Restricts `connect-src` to `'self'`, GitHub API, and the two card-image APIs.

## External data sources

| Endpoint | Purpose | Data sent |
|---|---|---|
| `api.github.com` | Publish config & product JSON | GitHub token, file content |
| `api.scryfall.com` | MTG card images | Card name (for store display) |
| `api.pokemontcg.io` | Pokémon card images | Card name + set name |
| `fonts.googleapis.com` | Cinzel font | Browser metadata only |

No payment data, personal information, or session data is sent to any external
service. Payments are handled entirely by Square on their own domain.

## Reporting a vulnerability

If you discover a security issue, please email **jcmumph@gmail.com** directly.
Do not open a public GitHub issue for security vulnerabilities.
