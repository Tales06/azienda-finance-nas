# Azienda Finance NAS

Gestionale locale in Next.js per monitorare entrate e uscite aziendali. Include autenticazione con ruoli, categorie, multi-valuta, dashboard, esportazione PDF/Excel, PostgreSQL e distribuzione Docker su NAS.

## Requisiti del NAS

- Docker Engine con Docker Compose v2
- processore x86-64 oppure ARM64
- una cartella persistente per progetto e backup
- IP locale riservato dal router oppure un nome HTTPS stabile

Le immagini Node.js e PostgreSQL usate dal progetto sono multi-architettura. Conviene costruire l'immagine direttamente sul NAS con `docker compose up --build`.

## Prima installazione sul NAS

1. Copia la cartella del progetto sul NAS senza copiare `.env`, `node_modules`, `.next`, file ZIP o file temporanei.

2. Apri un terminale nella cartella del progetto e genera la configurazione usando l'IP reale del NAS:

```sh
sh scripts/configura-nas.sh 192.168.1.50
```

In questo esempio l'app sara raggiungibile su `http://192.168.1.50:3000`. Sostituisci l'indirizzo con quello effettivo del NAS.

Se hai gia configurato HTTPS nel reverse proxy del NAS, passa invece l'URL completo:

```sh
sh scripts/configura-nas.sh https://finance.mia-rete.it
```

Lo script crea password casuali per PostgreSQL, sessioni e amministratore. La password iniziale dell'amministratore viene mostrata una sola volta: salvala in un gestore di password.

3. Costruisci e avvia tutti i servizi:

```sh
docker compose up -d --build
```

Il servizio `init` attende PostgreSQL, applica automaticamente le migrazioni e crea azienda, amministratore e categorie iniziali. Le esecuzioni successive non sovrascrivono le categorie modificate.

4. Controlla lo stato:

```sh
docker compose ps
docker compose logs init
```

L'app e pronta quando `azienda-finance-app` risulta `healthy`.

## Indirizzo IP, localhost e rete Docker

- Nel browser di un altro computer non usare `localhost`: indicherebbe quel computer, non il NAS.
- Per accesso diretto in LAN usa `http://IP_DEL_NAS:3000` in `APP_URL`.
- Dentro Docker, PostgreSQL si chiama sempre `db:5432`. Non sostituirlo con l'IP del NAS nella `DATABASE_URL`.
- La porta PostgreSQL non viene pubblicata sulla LAN; solo l'applicazione espone la porta configurata da `APP_PORT`.
- È consigliabile riservare l'IP del NAS nel router, altrimenti un cambio di IP richiede di aggiornare `APP_URL` e riavviare i container.

Dopo una modifica di `.env`:

```sh
docker compose up -d --force-recreate
```

## Reverse proxy HTTPS

Con HTTPS imposta nel file `.env`:

```env
APP_URL="https://finance.mia-rete.it"
```

Il reverse proxy deve inoltrare le richieste alla porta 3000 dell'app. Se il reverse proxy gira direttamente sul sistema del NAS e supporta l'accesso alla porta locale, puoi limitare l'ascolto modificando:

```env
APP_BIND_ADDRESS="127.0.0.1"
```

Se il reverse proxy gira in un altro container, lascia `0.0.0.0` e limita l'accesso tramite firewall o rete Docker. Con HTTPS i cookie di sessione vengono automaticamente marcati come sicuri; con un URL HTTP restano compatibili con la sola LAN.

## Persistenza del database

Per impostazione predefinita PostgreSQL usa il volume Docker `finance-db-data`. Se il sistema di backup del NAS lavora meglio con una cartella visibile, imposta un percorso locale del NAS:

```env
DB_DATA_PATH="/percorso/locale/del/nas/azienda-finance/postgres"
```

Usa una cartella sul filesystem locale del NAS, non una condivisione SMB/NFS montata da un altro dispositivo. Non cambiare `DB_DATA_PATH` dopo aver iniziato a usare l'app senza prima migrare i dati.

## Backup PostgreSQL

Per creare manualmente un backup consistente:

```sh
docker compose --profile maintenance run --rm backup
```

Il file viene salvato nella cartella `./backups` oppure nel percorso configurato da `BACKUP_PATH`. Pianifica questo comando ogni giorno tramite l'utilità di pianificazione del NAS e copia i backup anche su un secondo dispositivo.

Per ripristinare un backup, ferma prima l'applicazione e scegli il file corretto:

```sh
docker compose stop app
docker compose exec -T db sh -c 'pg_restore --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backups/finance_AAAAMMGG_HHMMSS.dump
docker compose up -d app
```

Prova periodicamente il ripristino: un backup non verificato non garantisce il recupero dei dati.

## Notifiche delle scadenze sul telefono (opzionale)

L'app mostra sempre la campanella e la pagina **Scadenze**: contengono i movimenti in attesa, separati fra scaduti, oggi, domani e senza data. Per ricevere un avviso sul telefono il progetto include anche un piccolo server privato `ntfy`, avviato solo quando abiliti il profilo `notifications`.

Il messaggio inviato al telefono contiene soltanto il numero di scadenze e il nome dell'azienda: non include importi, descrizioni, clienti o categorie.

1. Sul NAS scegli un argomento lungo e non prevedibile, ad esempio `finance-una-stringa-casuale-lunga`. Non pubblicarlo e non riutilizzarlo altrove.

2. Nel file `.env` del NAS aggiungi queste variabili. `IP_TAILSCALE_DEL_NAS` deve essere l'indirizzo Tailscale del NAS, in modo che l'iPhone possa raggiungerlo anche fuori casa:

```env
NTFY_PUBLIC_BASE_URL="http://IP_TAILSCALE_DEL_NAS:2586"
NTFY_PORT="2586"
NTFY_DATA_PATH="/volume1/docker/azienda-finance/ntfy"
NTFY_PUBLISH_URL="http://ntfy"
NTFY_TOPIC="finance-una-stringa-casuale-lunga"
TAILSCALE_CONTAINER_NAME="tailscale"
NTFY_RELAY_HOST="192.168.1.23"
```

3. Avvia il servizio e crea un utente privato. I primi due comandi chiedono una password: scegline una nuova e conservala nel gestore di password.

```sh
docker compose --profile notifications up -d --build ntfy ntfy-relay
docker compose exec ntfy ntfy user add finance-sender
docker compose exec ntfy ntfy user add finance-phone
docker compose exec ntfy ntfy access finance-sender finance-una-stringa-casuale-lunga write
docker compose exec ntfy ntfy access finance-phone finance-una-stringa-casuale-lunga read
docker compose exec ntfy ntfy token add --label="Azienda Finance" finance-sender
docker compose exec ntfy ntfy token list finance-sender
```

4. Copia il valore che inizia con `tk_` mostrato dall'ultimo comando e aggiungilo al `.env` senza condividerlo:

```env
NTFY_ACCESS_TOKEN="tk_valore_privato_generato_da_ntfy"
```

5. Sul telefono installa **ntfy**, imposta come server predefinito esattamente `NTFY_PUBLIC_BASE_URL`, accedi con `finance-phone` e iscriviti all'argomento `NTFY_TOPIC`. L'utente del telefono può solo leggere; il token del NAS può solo inviare.

Se Tailscale gira in un container separato, come nel caso del NAS UGREEN, abilita una sola volta il proxy Tailscale verso il relay interno:

```sh
docker exec tailscale tailscale serve --http=2586 http://127.0.0.1:8080
```

Con questa architettura il telefono usa `http://IP_TAILSCALE_DEL_NAS:2586`; non serve aprire porte sul router.

6. Verifica e pianifica l'invio quotidiano alle 08:00:

```sh
docker compose --profile notifications run --rm reminders
```

Nel `crontab` dell'utente root del NAS aggiungi questa riga:

```cron
0 8 * * * cd /volume1/docker/azienda-finance && /usr/bin/docker compose --profile notifications run --rm reminders >> /volume2/backup/database-finance/reminders.log 2>&1
```

Per iPhone il server e gia predisposto per gli avvisi immediati: il servizio centrale viene usato solo per richiamare l'app; il telefono recupera poi il messaggio dal tuo NAS via Tailscale.

## Aggiornamento dell'applicazione

Prima crea un backup, poi aggiorna i file e ricostruisci:

```sh
docker compose --profile maintenance run --rm backup
docker compose up -d --build
```

Le migrazioni vengono applicate automaticamente prima dell'avvio della nuova versione.

## Avvio in sviluppo

Per lavorare fuori dal NAS, crea `.env` partendo da `.env.example` e usa credenziali locali. In sviluppo `APP_URL` puo essere:

```env
APP_URL="http://localhost:3000"
```

Poi avvia database, migrazioni e applicazione:

```sh
docker compose up -d db
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Ruoli

- `ADMIN`: pieno accesso
- `MANAGER`: operazioni e categorie
- `OPERATOR`: inserimento e modifica movimenti
- `VIEWER`: sola lettura

Non esiste registrazione pubblica: gli utenti vengono creati dall'amministratore.
