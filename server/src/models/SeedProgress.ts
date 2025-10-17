import mongoose, { Schema, Document } from "mongoose";

export interface ISeedProgress extends Document {
  name: string;          // e.g., "perenualPlants"
  lastPage: number;      // last page fetched from API
  lastPlantIndex: number; // index within the last page
}

const SeedProgressSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  lastPage: { type: Number, default: 1 },
  lastPlantIndex: { type: Number, default: 0 },
});

export const SeedProgress = mongoose.model<ISeedProgress>(
  "SeedProgress",
  SeedProgressSchema
);
