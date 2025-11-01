import mongoose from "mongoose";
const { Schema, model } = mongoose;

const PlantGrowthSnapshotSchema = new Schema(
  {
    bedId: { type: Schema.Types.ObjectId, ref: "Bed", index: true, required: true },
    plantInstanceId: { type: Schema.Types.ObjectId, required: true, index: true },
    day: { type: Date, required: true }, // normalized to midnight of the simulated day
    sunlightHours: { type: Number, required: true },
    shadedHours: { type: Number, default: 0 },
    tempOkHours: { type: Number, default: 0 },
    height: { type: Number, required: true },
    canopyRadius: { type: Number, required: true },
    modelVersion: { type: String, required: true },
    inputs: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

PlantGrowthSnapshotSchema.index({ bedId: 1, plantInstanceId: 1, day: 1 }, { unique: true });

export default model("PlantGrowthSnapshot", PlantGrowthSnapshotSchema);
