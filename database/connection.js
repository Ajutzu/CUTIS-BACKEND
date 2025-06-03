// Impoting required modules
import mongoose from "mongoose";
import dotenv from "dotenv";
import colors from "colors";

dotenv.config();

// Connect to MongoDB Atlas
export default async function connectToCutisDB() {
  try {
    await mongoose.connect(process.env.CONNECTION, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(colors.green('✅ Connected to CutisDB successfully'));
  } catch (error) {
    console.error(colors.red('❌ MongoDB connection error:', error));
  }
}

