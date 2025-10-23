import mongoose from "mongoose";

const plantSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  image: {type: String },
  height: { type: Number, default: 30 },
  canopyRadius: { type: Number, default: 30 },
  maxHeight: {type: Number},
  maxCanopyRadius: {type: Number},
  sunReq: { type: Number, required: true },
  baseGrowthRate: { type: Number },
  currentGrowthRate: { type: Number },
  maturityDays: { type: Number },
  waterReq: { type: String},
  nutrients:{ type: String},
  pH: { type: Number},
  spacing: { type: Number},
  companions: { type: [String]},
  enemies: { type: [String]},
  diseases: { type: [String]},
  pests: {type: [String]},
  daysToHarvest: { type: Number},
  harvestAvg: { type: Number},
  perennial: { type: Boolean },
  annual: { type: Boolean},
  frostZone: { type: String},
  idealTemp: { type: Number},
  comments: {type: String}
});

export default mongoose.model("Plant", plantSchema);