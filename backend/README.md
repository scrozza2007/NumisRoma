# NumisRoma

![License](https://img.shields.io/badge/license-MIT-blue.svg)

NumisRoma è un'applicazione web completa per esplorare e collezionare monete antiche romane. Il progetto è composto da un frontend moderno sviluppato con Next.js e un backend robusto basato su Node.js con Express e MongoDB.

## Funzionalità

- 🔍 **Catalogo completo** di monete romane con ricerca avanzata e filtri
- 👤 **Sistema di autenticazione** per registrazione e login utenti
- 📚 **Gestione collezioni personali** per organizzare le proprie monete
- 📱 **Progressive Web App (PWA)** con funzionalità offline
- 🌙 **Tema adattivo** chiaro/scuro basato sulle preferenze del sistema
- 📊 **API REST** completamente documentata con Swagger/OpenAPI

## Architettura

### Backend (Node.js/Express)
- Framework: Express.js con architettura MVC
- Database: MongoDB con Mongoose ORM
- Autenticazione: JWT (JSON Web Tokens)
- Sicurezza: middleware Helmet, rate limiting, validazione input
- Documentazione: Swagger/OpenAPI integrato
- Testing: Jest con Supertest

### Frontend (Next.js)
- Framework: Next.js 14 con App Router
- Stato: Zustand per gestione globale dello stato
- Styling: TailwindCSS con tema personalizzato
- Data fetching: React Query per caching e gestione chiamate API
- PWA: next-pwa per funzionalità offline
- Testing: Vitest per unit test, Cypress per E2E

## Installazione e Setup

### Prerequisiti
- Node.js (v16+)
- MongoDB
- Git

### Installazione Locale

1. Clona il repository:
```bash
git clone https://github.com/yourusername/numisroma.git
cd numisroma
```

2. Configura il backend:
```bash
# Installa le dipendenze
npm install

# Crea e configura il file .env
cp .env.example .env
# Modifica il file .env con le tue configurazioni
```

3. Configura il frontend:
```bash
cd frontend
npm install
cd ..
```

4. Avvio in modalità sviluppo:
```bash
# Terminal 1: Backend (nella directory principale)
npm run dev

# Terminal 2: Frontend (nella directory frontend)
cd frontend && npm run dev
```

Il backend sarà disponibile su http://localhost:4000 con la documentazione API su http://localhost:4000/api-docs.
Il frontend sarà disponibile su http://localhost:3000.

### Utilizzo di Docker

Per avviare l'intero stack applicativo con Docker:

```bash
# Costruisci e avvia i container
docker-compose up -d

# Per fermare i container
docker-compose down
```

## API Endpoints

L'API espone i seguenti endpoint principali:

### Autenticazione
- `POST /api/auth/register` - Registrazione nuovo utente
- `POST /api/auth/login` - Login utente
- `GET /api/auth/me` - Informazioni utente autenticato

### Monete
- `GET /api/coins` - Lista monete con filtri e paginazione
- `POST /api/coins` - Creazione nuova moneta (richiede autenticazione)
- `GET /api/coins/:id` - Dettagli moneta specifica

### Collezioni
- `GET /api/collections` - Lista collezioni utente (richiede autenticazione)
- `POST /api/collections` - Creazione nuova collezione (richiede autenticazione)
- `POST /api/collections/:id/coins` - Aggiunta moneta alla collezione (richiede autenticazione)

Per una documentazione completa, consultare la pagina Swagger disponibile su `/api-docs`.

## Testing

### Backend
```bash
# Esegue i test con Jest
npm test
```

### Frontend
```bash
# Esegue i test unitari con Vitest
cd frontend && npm test

# Esegue i test end-to-end con Cypress
cd frontend && npm run test:e2e:dev
```

## Deployment

Il progetto include configurazioni Docker per il deployment:

- `Dockerfile` - Configurazione per il backend
- `frontend/Dockerfile` - Configurazione per il frontend
- `docker-compose.yml` - Orchestrazione dei servizi (MongoDB, backend, frontend)

Inoltre, è inclusa una configurazione CI/CD con GitHub Actions che esegue test automatici e costruisce le immagini Docker ad ogni push sul ramo principale.

## Struttura del Progetto

```
numisroma/
├── src/                # Backend Node.js
│   ├── controllers/    # Controller delle API
│   ├── middlewares/    # Middleware (auth, rate limiting, ecc.)
│   ├── models/         # Modelli Mongoose
│   └── routes/         # Definizione route API
│
├── frontend/           # Frontend Next.js
│   ├── app/            # Struttura App Router
│   ├── components/     # Componenti React riutilizzabili
│   ├── lib/            # Utilities, store, API client
│   └── public/         # Asset statici
│
├── tests/              # Test backend
├── .github/            # Configurazione CI/CD
└── docker-compose.yml  # Configurazione Docker
```

## Licenza

Questo progetto è distribuito con licenza MIT. 