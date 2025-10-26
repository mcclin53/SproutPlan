import mongoose from "mongoose";
const { Schema, model } = mongoose;

const PlantInstanceSchema = new Schema(
  {
    basePlant: { type: Schema.Types.ObjectId, ref: "Plant", required: true, index: true },
    bedId:     { type: Schema.Types.ObjectId, ref: "Bed", default: null, index: true }, // null = outside bed || != null = inside bed
    x:         { type: Number, required: true, default: 0 },
    y:         { type: Number, required: true, default: 0 },
    height:        { type: Number, required: true, default: 0 },
    canopyRadius:  { type: Number, required: true, default: 0 },
    plantedAt:     { type: Date, default: Date.now },
    lastSimulatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default model("PlantInstance", PlantInstanceSchema);