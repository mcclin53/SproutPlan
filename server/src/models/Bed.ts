import mongoose, { Schema, model } from "mongoose";

const plantInstanceSchema = new Schema({
  basePlant: {
    type: Schema.Types.ObjectId,
    ref: "Plant",
    required: true,
  },
  plantedAt: {
    type: Date,
    default: Date.now,
  },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
});

const bedSchema = new Schema({
  width: { type: Number, required: true },
  length: { type: Number, required: true },
  plants: [plantInstanceSchema], // <-- use 'plants' array for instances
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
});

export const Bed = model("Bed", bedSchema);
