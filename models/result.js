import mongoose from 'mongoose';

const { Schema, model} = mongoose;

// Specialist Subschema
const SpecialistSchema = new Schema({
  name: String,
  link: String,
  description: String,
  specialty: String
}, { _id: false });

// Clinic Subschema
const ClinicSchema = new Schema({
  title: String,
  link: String,
  snippet: String,
  condition: String
}, { _id: false });

// Composite Search Result Schema
const SearchResultSchema = new Schema({
  location: { type: String, required: true },
  condition: { type: String, required: true },
  specialists: [SpecialistSchema],
  clinics: [ClinicSchema],
  lastFetched: { type: Date, default: Date.now } 
});

SearchResultSchema.index({ location: 1, condition: 1 }, { unique: true });

const SearchResult = model('result', SearchResultSchema);

export default SearchResult;
