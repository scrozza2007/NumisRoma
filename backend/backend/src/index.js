require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const authRoutes = require('./routes/auth');
const coinRoutes = require('./routes/coins');
const collectionRoutes = require('./routes/collections');

const app = express();

// Security Middlewares
app.use(helmet()); // Secure HTTP headers
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Logging

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Troppe richieste da questo IP, riprova più tardi'
});
app.use('/api/', limiter);

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'NumisRoma API',
      version: '1.0.0',
      description: 'API per la gestione di monete antiche romane e collezioni',
      contact: {
        name: 'API Support',
        email: 'support@numisroma.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Rotta di test
app.get('/', (req, res) => {
  res.send('API online');
});

// Rotte di autenticazione
app.use('/api/auth', authRoutes);
// Rotte per le monete
app.use('/api/coins', coinRoutes);
// Rotte per le collezioni
app.use('/api/collections', collectionRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Si è verificato un errore sul server' });
});

// Connessione a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connesso a MongoDB'))
  .catch((err) => console.error('Errore connessione MongoDB:', err));

// Avvio server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server avviato su http://localhost:${PORT}`));