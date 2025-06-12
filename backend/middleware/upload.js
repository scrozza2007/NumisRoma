const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Crea la cartella uploads se non esiste
const uploadsDir = path.join(__dirname, '../uploads');
const collectionsDir = path.join(uploadsDir, 'collections');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(collectionsDir)) {
  fs.mkdirSync(collectionsDir, { recursive: true });
}

// Configurazione multer per file temporanei
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accetta solo immagini
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limite
  }
});

// Middleware per processare l'immagine
const processCollectionImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    // Genera un nome file unico
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `collection_${timestamp}_${randomString}.webp`;
    const filepath = path.join(collectionsDir, filename);

    // Processa l'immagine con Sharp
    await sharp(req.file.buffer)
      .resize(800, 600, { 
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85 })
      .toFile(filepath);

    // Aggiungi il percorso del file al request
    req.uploadedImage = {
      filename: filename,
      path: `/uploads/collections/${filename}`,
      fullPath: filepath
    };

    next();
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ msg: 'Error processing image' });
  }
};

// Funzione per eliminare un'immagine
const deleteImage = (imagePath) => {
  if (!imagePath) return;
  
  try {
    // Estrae il nome del file dal path
    const filename = path.basename(imagePath);
    const fullPath = path.join(collectionsDir, filename);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
  }
};

// Middleware per processare le immagini delle monete
const processCoinImage = async (req, res, next) => {
  try {
    const processedImages = {};
    
    if (req.files) {
      // Crea la cartella per le monete se non esiste
      const coinsDir = path.join(uploadsDir, 'coins');
      if (!fs.existsSync(coinsDir)) {
        fs.mkdirSync(coinsDir, { recursive: true });
      }
      
      // Processa l'immagine del dritto se presente
      if (req.files.obverse && req.files.obverse[0]) {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `coin_obverse_${timestamp}_${randomString}.webp`;
        const filepath = path.join(coinsDir, filename);
        
        await sharp(req.files.obverse[0].buffer)
          .resize(600, 600, { 
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .webp({ quality: 90 })
          .toFile(filepath);
        
        processedImages.obverse = {
          filename: filename,
          path: `/uploads/coins/${filename}`,
          fullPath: filepath
        };
      }
      
      // Processa l'immagine del rovescio se presente
      if (req.files.reverse && req.files.reverse[0]) {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `coin_reverse_${timestamp}_${randomString}.webp`;
        const filepath = path.join(coinsDir, filename);
        
        await sharp(req.files.reverse[0].buffer)
          .resize(600, 600, { 
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .webp({ quality: 90 })
          .toFile(filepath);
        
        processedImages.reverse = {
          filename: filename,
          path: `/uploads/coins/${filename}`,
          fullPath: filepath
        };
      }
    }
    
    req.processedImages = processedImages;
    next();
  } catch (error) {
    console.error('Error processing coin images:', error);
    res.status(500).json({ msg: 'Error processing images' });
  }
};

module.exports = {
  upload: upload.single('image'),
  uploadFields: upload.fields([
    { name: 'obverse', maxCount: 1 },
    { name: 'reverse', maxCount: 1 }
  ]),
  processCollectionImage,
  processCoinImage,
  deleteImage
}; 