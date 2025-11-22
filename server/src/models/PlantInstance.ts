import mongoose from "mongoose";
const { Schema, model } = mongoose;

export const leafLayoutSchema = new Schema(
  {
    index: Number,          // 0..maxLeaves-1
    angleDeg: Number,       // rotation around stem
    radiusPx: Number,       // horizontal offset from stem center
    heightFrac: Number,     // 0..1, how high up the stem
  },
  { _id: false }
);

export const PlantInstanceSchema = new Schema(
  {
    basePlant: { type: Schema.Types.ObjectId, ref: "Plant", required: true, index: true },
    bedId:     { type: Schema.Types.ObjectId, ref: "Bed", default: null, index: true }, // null = outside bed || != null = inside bed
    x:         { type: Number, required: true, default: 0 },
    y:         { type: Number, required: true, default: 0 },
    height:        { type: Number, required: true, default: 0 },
    canopyRadius:  { type: Number, required: true, default: 0 },
    plantedAt:     { type: Date, default: Date.now },
    lastSimulatedAt: { type: Date, default: null },
    leafGrowth: { type: Number, default: 0 }, // drives which leaf is growing
    leafLayout: { type: [leafLayoutSchema], default: [] },
  },
  { timestamps: true }
);

export default model("PlantInstance", PlantInstanceSchema);