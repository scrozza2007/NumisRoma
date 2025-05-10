# NumisRoma 🏛️

**NumisRoma** è la web app definitiva per gli appassionati di monete imperiali romane. Creata con **React** e **Node.js**, ti permette di esplorare e catalogare monete antiche come un vero numismatico. Senza registrazione, puoi navigare liberamente, ma se ti registri, potrai gestire la tua collezione personale in tutta tranquillità.

## 🚀 Caratteristiche Principali

- **Catalogo aperto**: Esplora liberamente il database delle monete imperiali romane e identifica quelle che ti interessano.
- **Gestione Collezioni**: Se sei registrato, aggiungi le tue monete al database e costruisci la tua collezione digitale.
- **Privacy Personalizzata**: Vuoi che la tua collezione sia visibile a tutti o solo a te? Nessun problema, puoi scegliere!
- **Espandibilità**: Nel futuro, NumisRoma includerà anche monete repubblicane e provinciali per arricchire il tuo catalogo.

## 🛠️ Tecnologie Utilizzate

- **Frontend**: React
- **Backend**: Node.js
- **Autenticazione**: JWT (JSON Web Tokens)
- **Testing E2E**: Cypress

## 🛠️ Installazione

1️⃣ **Clona il repository**  
```
git clone https://github.com/scrozza2007/NumisRoma.git
cd NumisRoma
```

2️⃣ **Installa le dipendenze**  
   - **Backend**:  
   ```
   cd backend
   npm install
   ```
   - **Frontend**:  
   ```
   cd ../frontend
   npm install
   ```

3️⃣ **Avvia l'applicazione**  
   - **Avvia il backend**:  
   ```
   cd backend
   npm start
   ```
   - **Avvia il frontend**:  
   ```
   cd frontend
   npm start
   ```

L'app sarà disponibile su [http://localhost:3000](http://localhost:3000).

## 🧪 Test End-to-End (Cypress)

**Come eseguire i test con Cypress**

   1. Assicurati di aver installato tutte le dipendenze (`npm install`)
   2. Avvia **sia il backend che il frontend**
   3. Da una nuova finestra terminale, esegui:

   ```
   cd frontend
   npm run cypress:open
   ```

   4. Scegli un browser e clicca su un test per avviarlo

## 📂 Struttura del Progetto

```
numisroma/
├── backend/       # Server
├── frontend/      # Applicazione React + Next.js
│   └── cypress/   # Test end-to-end
├── README.md      # Questo file!
```

## 🤝 Come Contribuire

1. Forka il repository e crea una nuova branch.
2. Aggiungi le tue modifiche e testale.
3. Crea una **pull request** per la revisione.

Ogni suggerimento e miglioramento è il benvenuto!

## 📜 Licenza

Tutti i diritti riservati. Questo software non può essere utilizzato, copiato, modificato, distribuito, venduto o reso disponibile a terzi senza il permesso esplicito del proprietario del copyright.

## 📬 Contatti

Hai domande o idee? Contattami su GitHub!
