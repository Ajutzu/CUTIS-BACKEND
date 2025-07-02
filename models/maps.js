import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const CoordinatesSchema = new Schema({
  lat: Number,
  lng: Number
}, { _id: false });

const MapEntrySchema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  type: { type: String, enum: ['clinic', 'hospital', 'pharmacy', 'specialist', 'other'], default: 'clinic' },
  coordinates: CoordinatesSchema,
  link: String,
  description: String,
  location: { type: String, required: true },
  lastFetched: { type: Date, default: Date.now }
});

MapEntrySchema.index({ name: 1, address: 1, location: 1 }, { unique: true });

const MapEntry = model('map', MapEntrySchema);

export default MapEntry;
