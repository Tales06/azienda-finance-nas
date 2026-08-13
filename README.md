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
