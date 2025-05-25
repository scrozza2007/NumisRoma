# Documentazione Sistema di Messaggistica - NumisRoma

## Panoramica

Il sistema di messaggistica di NumisRoma permette agli utenti registrati di comunicare tra loro attraverso chat private. La funzionalità è completamente integrata nell'applicazione e offre un'esperienza utente moderna e intuitiva con aggiornamenti quasi in tempo reale tramite polling.

## Caratteristiche Principali

### ✅ Funzionalità Implementate

- **Messaggistica con polling** per aggiornamenti quasi in tempo reale
- **Interfaccia chat moderna** con lista conversazioni e area messaggi
- **Ricerca utenti** per iniziare nuove conversazioni
- **Notifiche visive** per nuovi messaggi
- **Badge contatore** messaggi non letti nella navbar
- **Sicurezza completa** - solo partecipanti possono vedere i messaggi
- **Persistenza messaggi** nel database MongoDB
- **Autenticazione richiesta** per tutte le funzionalità
- **Scroll automatico** ai nuovi messaggi
- **Indicatori di lettura** dei messaggi
- **Gestione errori** completa con notifiche
- **Interfaccia responsive** per tutti i dispositivi

### 🔧 Architettura Tecnica

#### Backend (Node.js + Express + MongoDB)

**Modelli Database:**
- `Conversation`: Gestisce le conversazioni tra utenti
- `Message`: Gestisce i singoli messaggi

**API Endpoints:**
- `GET /api/messages/conversations` - Lista conversazioni utente
- `GET /api/messages/conversations/:otherUserId` - Crea/ottieni conversazione
- `GET /api/messages/unread-count` - Conteggio messaggi non letti
- `GET /api/messages/:conversationId` - Messaggi di una conversazione
- `POST /api/messages/:conversationId` - Invia nuovo messaggio
- `PUT /api/messages/:conversationId/read` - Segna messaggi come letti
- `DELETE /api/messages/message/:messageId` - Elimina messaggio
- `GET /api/messages/search/users` - Cerca utenti

#### Frontend (Next.js + React + Tailwind CSS)

**Componenti:**
- `Messages` - Pagina principale messaggistica
- `NotificationToast` - Sistema notifiche
- `Navbar` - Aggiornata con link messaggi e badge contatore

**Funzionalità:**
- Polling automatico per aggiornamenti (3s per messaggi, 5s per conversazioni)
- Gestione stato conversazioni e messaggi
- Notifiche in tempo reale
- Interfaccia responsive
- Badge contatore messaggi non letti

## Guida all'Uso

### Per gli Utenti

1. **Accesso**: Effettua il login per accedere ai messaggi
2. **Navigazione**: Clicca sull'icona messaggi nella navbar o vai su `/messages`
3. **Badge contatore**: Vedi il numero di messaggi non letti nell'icona
4. **Nuova conversazione**: Clicca il pulsante "+" e cerca un utente
5. **Invio messaggi**: Seleziona una conversazione e scrivi nel campo di input
6. **Aggiornamenti**: I messaggi si aggiornano automaticamente ogni 3 secondi

### Per gli Sviluppatori

#### Installazione

Non sono necessarie dipendenze aggiuntive oltre a quelle già presenti nel progetto.

#### Configurazione Environment

Assicurati che il file `.env` del backend contenga:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

#### Avvio Applicazione

```bash
# Backend (porta 4000)
cd backend
npm run dev

# Frontend (porta 3000)
cd frontend
npm run dev
```

## Sicurezza

### Autenticazione
- Tutte le API richiedono token JWT valido
- Middleware di autenticazione su tutte le rotte
- Verifica token per ogni richiesta

### Autorizzazione
- Gli utenti possono vedere solo le proprie conversazioni
- Verifica partecipazione prima di ogni operazione
- Messaggi visibili solo ai partecipanti della conversazione

### Validazione Dati
- Validazione input con express-validator
- Sanitizzazione contenuto messaggi
- Controllo esistenza utenti e conversazioni

## Database Schema

### Conversation Model
```javascript
{
  participants: [ObjectId], // Array di ID utenti
  lastMessage: ObjectId,    // Riferimento ultimo messaggio
  lastActivity: Date,       // Timestamp ultima attività
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model
```javascript
{
  conversation: ObjectId,   // Riferimento conversazione
  sender: ObjectId,         // ID utente mittente
  content: String,          // Contenuto messaggio
  messageType: String,      // 'text' o 'image'
  imageUrl: String,         // URL immagine (opzionale)
  readBy: [{               // Array utenti che hanno letto
    user: ObjectId,
    readAt: Date
  }],
  isDeleted: Boolean,       // Flag eliminazione soft
  createdAt: Date,
  updatedAt: Date
}
```

## API Reference

### Autenticazione
Tutte le richieste devono includere l'header:
```
Authorization: Bearer <jwt_token>
```

### Endpoints Dettagliati

#### GET /api/messages/conversations
Restituisce tutte le conversazioni dell'utente autenticato.

**Response:**
```json
[
  {
    "_id": "conversation_id",
    "participants": [
      {
        "_id": "user_id",
        "username": "username",
        "fullName": "Full Name",
        "avatar": "avatar_url"
      }
    ],
    "lastMessage": {
      "_id": "message_id",
      "content": "Ultimo messaggio",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "lastActivity": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET /api/messages/unread-count
Restituisce il conteggio dei messaggi non letti.

**Response:**
```json
{
  "unreadCount": 5
}
```

#### POST /api/messages/:conversationId
Invia un nuovo messaggio.

**Body:**
```json
{
  "content": "Testo del messaggio",
  "messageType": "text"
}
```

**Response:**
```json
{
  "_id": "message_id",
  "conversation": "conversation_id",
  "sender": {
    "_id": "user_id",
    "username": "username",
    "fullName": "Full Name"
  },
  "content": "Testo del messaggio",
  "messageType": "text",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Sistema di Polling

### Aggiornamenti Automatici
- **Messaggi**: Polling ogni 3 secondi per la conversazione attiva
- **Conversazioni**: Polling ogni 5 secondi per la lista conversazioni
- **Contatore non letti**: Polling ogni 30 secondi nella navbar

### Ottimizzazioni
- Aggiornamenti "silenziosi" per evitare flickering
- Gestione automatica degli intervalli
- Cleanup dei timer alla disconnessione

## Troubleshooting

### Problemi Comuni

1. **Messaggi non si aggiornano**
   - Verifica che il backend sia avviato
   - Controlla la console per errori di rete
   - Verifica il token JWT

2. **Badge contatore non funziona**
   - Controlla l'endpoint `/api/messages/unread-count`
   - Verifica che l'utente sia autenticato

3. **Errori di autenticazione**
   - Verifica che il token JWT sia valido
   - Controlla che l'utente sia autenticato

4. **Notifiche non funzionano**
   - Verifica che il componente NotificationToast sia importato
   - Controlla la console per errori JavaScript

### Log e Debug

Il sistema include logging completo:
- Errori API con stack trace
- Errori di polling per debugging
- Stati di caricamento per UX

## Performance

### Ottimizzazioni Implementate
- Polling intelligente con aggiornamenti silenziosi
- Gestione efficiente degli stati React
- Cleanup automatico dei timer
- Limitazione query database con paginazione

### Metriche
- **Latenza messaggi**: ~3 secondi (polling)
- **Carico server**: Minimo con polling ottimizzato
- **Esperienza utente**: Fluida con feedback immediato

## Estensioni Future

### Funzionalità Pianificate
- [ ] WebSocket per tempo reale vero
- [ ] Invio immagini e file
- [ ] Messaggi vocali
- [ ] Gruppi di chat
- [ ] Ricerca nei messaggi
- [ ] Archiviazione conversazioni
- [ ] Stato online/offline utenti
- [ ] Typing indicators

### Miglioramenti Tecnici
- [ ] Cache Redis per performance
- [ ] Compressione messaggi
- [ ] Rate limiting
- [ ] Backup automatico conversazioni
- [ ] Migrazione a WebSocket

## Supporto

Per problemi o domande:
1. Controlla questa documentazione
2. Verifica i log del server
3. Controlla la console del browser per errori JavaScript
4. Testa le API con Postman/curl

## Changelog

### v1.0.0 (Corrente)
- ✅ Sistema messaggistica base implementato
- ✅ Polling per aggiornamenti quasi in tempo reale
- ✅ Interfaccia utente completa
- ✅ Notifiche visive e badge contatore
- ✅ Sicurezza e autenticazione
- ✅ Documentazione completa
- ✅ Ottimizzazioni performance
- ✅ Gestione errori robusta 