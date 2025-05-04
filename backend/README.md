# NumisRoma

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/yourusername/numisroma/NumisRoma%20CI/CD)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

NumisRoma è un'applicazione web per esplorare e collezionare monete antiche romane. L'applicazione è composta da un frontend Next.js e un backend Node.js con Express e MongoDB.

![Screenshot](docs/screenshot.png)

## Funzionalità

- 🔍 Catalogo completo di monete con ricerca e filtri avanzati
- 👤 Autenticazione utenti (registrazione e login)
- 📚 Gestione delle collezioni personali
- 📱 Progressive Web App (PWA) con funzionalità offline
- 🌙 Modalità chiara/scura automatica

## Tecnologie

### Backend
- Node.js con Express
- MongoDB con Mongoose
- JWT per l'autenticazione
- Swagger/OpenAPI per la documentazione API
- Helmet, rate limiting e altre misure di sicurezza

### Frontend
- Next.js 14 (App Router)
- TailwindCSS per lo styling
- Zustand per la gestione dello stato globale
- React Query per il caching dei dati
- Supporto PWA tramite next-pwa

## Installazione e setup

### Prerequisiti
- Node.js (v16+)
- MongoDB
- Docker & Docker Compose (opzionale)

### Avvio locale

1. Clona il repository:
```bash
git clone https://github.com/yourusername/numisroma.git
cd numisroma
```

2. Configura il backend:
```bash
# Installa le dipendenze backend
npm install

# Crea il file .env (modifica con i tuoi dati)
cp .env.example .env
```

3. Configura il frontend:
```bash
# Entra nella directory frontend
cd frontend

# Installa le dipendenze frontend
npm install

# Torna alla directory principale
cd ..
```

4. Avvia l'applicazione in modalità sviluppo:
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Avvio con Docker

Per avviare l'intera applicazione con Docker Compose:

```bash
docker-compose up -d
```

L'applicazione sarà disponibile su:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Documentazione API: http://localhost:4000/api-docs

## Struttura del progetto

```
numisroma/
├── frontend/            # Frontend Next.js
│   ├── app/             # App Router di Next.js
│   ├── components/      # Componenti React
│   ├── lib/             # Utilities, store, API client
│   └── public/          # Asset statici
│
├── src/                 # Backend Node.js/Express
│   ├── controllers/     # Logica di business
│   ├── middlewares/     # Middleware Express
│   ├── models/          # Modelli Mongoose
│   └── routes/          # Route API
│
├── .github/             # Configurazione GitHub Actions
├── docker-compose.yml   # Configurazione Docker Compose
└── Dockerfile           # Dockerfile per il backend
```

## Testing

### Backend
```bash
npm test
```

### Frontend
```bash
cd frontend && npm test
```

### E2E Testing (Cypress)
```bash
cd frontend && npm run test:e2e
```

## Ambiente di produzione

Per il deployment in produzione, configura le seguenti variabili d'ambiente:

### Backend
- `NODE_ENV=production`
- `PORT=4000` (o altra porta desiderata)
- `MONGODB_URI=mongodb://your-mongodb-connection-string`
- `JWT_SECRET=your-secure-jwt-secret`

### Frontend
- `NODE_ENV=production`
- `NEXT_PUBLIC_API_URL=https://your-api-domain.com` (se diverso dai rewrites predefiniti)

## Licenza

[MIT License](LICENSE)

## Contatti

Nome - [email@example.com](mailto:email@example.com) 