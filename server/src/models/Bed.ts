import { Schema, model } from "mongoose";
import { PlantInstanceSchema } from "./PlantInstance";

const bedSchema = new Schema({
  width: { type: Number, required: true },
  length: { type: Number, required: true },
  plants: [PlantInstanceSchema], // <-- use 'plants' array for instances
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
}, { timestamps: true });

export const Bed = model("Bed", bedSchema);
