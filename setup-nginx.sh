#!/usr/bin/env bash
# setup-nginx.sh
#
# Sets up nginx as a TLS reverse proxy for the D1 God Roll Evaluator auth flow.
#
# Run once from the project root:
#   chmod +x setup-nginx.sh
#   sudo ./setup-nginx.sh
#
# What it does:
#   1. Installs nginx if not already present
#   2. Generates a self-signed TLS certificate for krypnos.net
#   3. Installs the nginx site config
#   4. Enables the site and reloads nginx

set -euo pipefail

DOMAIN="krypnos.net"
CERT_DIR="/etc/ssl/d1-god-roll"
NGINX_CONF_SRC="$(dirname "$0")/d1-god-roll-evaluator.nginx.conf"
NGINX_CONF_DEST="/etc/nginx/sites-available/d1-god-roll-evaluator"
NGINX_ENABLED="/etc/nginx/sites-enabled/d1-god-roll-evaluator"

# Must run as root
if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo ./setup-nginx.sh"
  exit 1
fi

echo ""
echo "=== D1 God Roll Evaluator — nginx setup ==="
echo ""

# ---------------------------------------------------------------------------
# 1. Install nginx
# ---------------------------------------------------------------------------
if command -v nginx &>/dev/null; then
  echo "[1/4] nginx already installed ($(nginx -v 2>&1)), skipping."
else
  echo "[1/4] Installing nginx..."
  apt-get update -qq
  apt-get install -y nginx
fi

# ---------------------------------------------------------------------------
# 2. Generate self-signed TLS certificate
# ---------------------------------------------------------------------------
echo "[2/4] Generating self-signed certificate for ${DOMAIN}..."
mkdir -p "${CERT_DIR}"

openssl req -x509 \
  -newkey rsa:4096 \
  -keyout "${CERT_DIR}/${DOMAIN}.key" \
  -out    "${CERT_DIR}/${DOMAIN}.crt" \
  -sha256 \
  -days   3650 \
  -nodes \
  -subj   "/CN=${DOMAIN}" \
  -addext "subjectAltName=DNS:${DOMAIN}"

chmod 600 "${CERT_DIR}/${DOMAIN}.key"
chmod 644 "${CERT_DIR}/${DOMAIN}.crt"
echo "    Certificate: ${CERT_DIR}/${DOMAIN}.crt"
echo "    Private key: ${CERT_DIR}/${DOMAIN}.key"

# ---------------------------------------------------------------------------
# 3. Install nginx site config
# ---------------------------------------------------------------------------
echo "[3/4] Installing nginx site config..."
if [[ ! -f "${NGINX_CONF_SRC}" ]]; then
  echo "    ERROR: Cannot find ${NGINX_CONF_SRC}"
  echo "    Run this script from the project root directory."
  exit 1
fi

cp "${NGINX_CONF_SRC}" "${NGINX_CONF_DEST}"

# Remove the default site if it's the only thing in sites-enabled,
# to avoid port 80/443 conflicts.
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  echo "    Disabling nginx default site..."
  rm /etc/nginx/sites-enabled/default
fi

# ---------------------------------------------------------------------------
# 4. Enable the site and reload nginx
# ---------------------------------------------------------------------------
echo "[4/4] Enabling site and reloading nginx..."

if [[ ! -L "${NGINX_ENABLED}" ]]; then
  ln -s "${NGINX_CONF_DEST}" "${NGINX_ENABLED}"
fi

nginx -t  # test config before reloading
systemctl enable nginx
systemctl reload nginx

echo ""
echo "=== Setup complete ==="
echo ""
echo "  nginx is now proxying https://${DOMAIN}/callback → http://127.0.0.1:7777/callback"
echo ""
echo "  Because the certificate is self-signed, your browser will show a warning"
echo "  when the OAuth redirect lands. You can safely click 'Advanced → Proceed'."
echo "  Node.js receives the request on the plain HTTP side, so it doesn't care."
echo ""
echo "Next steps:"
echo "  1. npm run auth       ← start the Node.js callback listener, then open the browser URL"
echo "  2. npm start          ← evaluate weapons (dry run)"
echo "  3. npm run apply      ← evaluate + write tags to DIM"
echo ""
