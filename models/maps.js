import mongoose from "mongoose";

const ClinicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  snippet: { type: String },
  link: { type: String },
  rating: { type: Number },
  coordinates: {
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
  },
  distance_km: { type: String },
  phone: { type: String },
  website: { type: String },
  hours: { type: String },
  price_range: { type: String },
  location_searched: { type: String }, // Track what location was searched
  created_at: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Create index for efficient queries
ClinicSchema.index({ "coordinates.lat": 1, "coordinates.lon": 1 });
ClinicSchema.index({ location_searched: 1 });
ClinicSchema.index({ name: 1, address: 1 }, { unique: true }); // Prevent duplicates

const Clinic = mongoose.model("Clinic", ClinicSchema);

export default Clinic;
