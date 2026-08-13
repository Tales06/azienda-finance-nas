#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Uso: sh scripts/configura-nas.sh IP_DEL_NAS"
  echo "Oppure: sh scripts/configura-nas.sh https://finance.esempio.it"
  exit 1
fi

public_address="$1"
case "$public_address" in
  http://*|https://*) app_url="$public_address" ;;
  *) app_url="http://${public_address}:3000" ;;
esac

case "$app_url" in
  *localhost*|*127.0.0.1*|*0.0.0.0*|*IP_DEL_NAS*)
    echo "Inserisci l'IP reale del NAS o il suo indirizzo HTTPS, non localhost."
    exit 1
    ;;
esac

if [ -e .env ]; then
  echo "Il file .env esiste gia. Per sicurezza non verra sovrascritto."
  echo "Spostalo o eliminalo solo se sei certo che non contenga la configurazione in uso."
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl non e disponibile sul NAS; installalo oppure compila .env.example manualmente."
  exit 1
fi

umask 077
postgres_password="$(openssl rand -hex 24)"
auth_secret="$(openssl rand -hex 32)"
admin_password="$(openssl rand -hex 12)"

cat > .env <<EOF
POSTGRES_DB="finance_app"
POSTGRES_USER="finance_user"
POSTGRES_PASSWORD="${postgres_password}"
DATABASE_URL="postgresql://finance_user:${postgres_password}@db:5432/finance_app?schema=public"
AUTH_SECRET="${auth_secret}"
APP_URL="${app_url}"
APP_BIND_ADDRESS="0.0.0.0"
APP_PORT="3000"
TZ="Europe/Rome"
BACKUP_PATH="./backups"
COMPANY_NAME="La Mia Azienda"
COMPANY_BASE_CURRENCY="EUR"
ADMIN_USERNAME="admin"
ADMIN_DISPLAY_NAME="Amministratore"
ADMIN_PASSWORD="${admin_password}"
EOF

echo "Configurazione NAS creata in .env con permessi riservati."
echo "Indirizzo applicazione: ${app_url}"
echo "Utente iniziale: admin"
echo "Password iniziale: ${admin_password}"
echo "Conserva subito la password in un posto sicuro."
