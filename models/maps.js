import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ClinicSchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true, unique: true },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
  },
  { timestamps: true }
);

const Clinic = model('clinic', ClinicSchema);

export default Clinic;
