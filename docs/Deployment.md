# Production Deployment

This deployment runs the React build, Express API, MongoDB, Nginx, and Certbot with Docker Compose. Nginx serves `crm.techbuzzsolution.com`, forwards `/api` and `/socket.io` to Express, and serves uploaded files through the API. MongoDB data, uploaded files, WhatsApp browser credentials, and Let's Encrypt certificates use persistent Docker volumes.

## Requirements

- A Linux host with Docker Engine and the Docker Compose plugin.
- DNS `A` (and, if configured, `AAAA`) records for `crm.techbuzzsolution.com` pointing to the host.
- Inbound TCP ports 80 and 443 open in the host firewall and cloud firewall.

Copy `.env.example` to `.env`. Set a unique MongoDB password, a JWT secret with at least 32 random bytes, and a real email address for Let's Encrypt. Keep `.env` private. If a MongoDB password contains URL-reserved characters, percent-encode it in `MONGO_URI`.

## First deployment

Run these commands from the repository root on the Linux host:

```sh
cp .env.example .env
# Edit .env and set the secrets and certificate email.
set -a
. ./.env
set +a
docker compose --profile bootstrap up -d --build mongo api web nginx-bootstrap
docker compose --profile certbot run --rm certbot certonly --webroot -w /var/www/certbot --email "${LETSENCRYPT_EMAIL}" -d "${DOMAIN}" --agree-tos --no-eff-email
docker compose --profile bootstrap stop nginx-bootstrap
docker compose up -d nginx
```

The bootstrap Nginx configuration serves the ACME challenge over HTTP. After Certbot creates the certificate, production Nginx redirects HTTP to HTTPS and terminates TLS. The browser bundle uses the same-origin `/api` base URL, and Nginx upgrades Socket.IO connections for real-time team chat.

## Updates and certificate renewal

Deploy application updates with:

```sh
docker compose up -d --build api web nginx
```

Renew certificates periodically on the host (for example, from a daily cron job):

```sh
docker compose --profile certbot run --rm certbot renew --webroot -w /var/www/certbot --quiet
docker compose exec nginx nginx -s reload
```

The second command reloads Nginx so it reads a renewed certificate. Back up the `mongo_data`, `api_uploads`, `whatsapp_auth`, and `letsencrypt` volumes. Do not publish MongoDB or the API port directly; only Nginx should be exposed to the internet.

## Configuration notes

- The API container uses Chromium at `/usr/bin/chromium` for the existing WhatsApp Web integration. Its authenticated browser profile persists in `whatsapp_auth`.
- Site-visit and import uploads persist in `api_uploads`.
- `CLIENT_URL` restricts API CORS to the deployed origin. Socket.IO uses the same setting.
- Optional Google OAuth and SMTP settings can be added to `.env` when configured. OAuth provider callback URLs must use `https://crm.techbuzzsolution.com/api/auth/google/callback`.
- To deploy under another hostname, update `DOMAIN`, `CLIENT_URL`, both Nginx `server_name` values, and the certificate paths in `production.conf`.