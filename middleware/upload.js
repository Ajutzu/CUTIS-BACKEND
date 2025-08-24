import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../utils/cloudinary.js';

// Standard storage for regular uploads
const standardStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'Cutis/Images',
    resource_type: 'image',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

// Storage for skin classification uploads
const skinStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'Cutis/Skins',
    resource_type: 'image',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    public_id: (req, file) => {
      let classification = 'Unclassified';
      
      if (req.body.predictions && req.body.predictions.length > 0) {
        const prediction = JSON.parse(req.body.predictions)[0];
        if (prediction.confidence >= 0.9) {
          classification = prediction.class;
        }
      } else if (req.body.classification) {
        classification = req.body.classification;
      }
      
      const uniqueFilename = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
      return `${classification}/${uniqueFilename}`;
    }
  },
});

export const upload = multer({ storage: standardStorage });

export const skinUpload = multer({ storage: skinStorage });
