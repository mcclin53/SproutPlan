import mongoose from "mongoose";

const bedSchema = new mongoose.Schema({
  width: { type: Number, required: true },
  length: { type: Number, required: true },
  plants: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, // unique instance ID
      plantType: { type: mongoose.Schema.Types.ObjectId, ref: "Plant", required: true },
      plantedAt: { type: Date, default: Date.now },
      // optional per-instance info: growth stage, notes, etc.
    }
  ],
});

export const Bed = mongoose.model("Bed", bedSchema);