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
  waterMax: { type: Number },
  waterMin: { type: Number },
  tempMax: { type: Number },
  tempMin: { type: Number },
  nutrients:{ type: String},
  pH: { type: Number},
  spacing: { type: Number},
  companions: { type: [String]},
  enemies: { type: [String]},
  diseases: { type: [String]},
  pests: {type: [String]},
  daysToHarvest: { type: Number},
  perennial: { type: Boolean },
  annual: { type: Boolean},
  comments: {type: String},
  kcProfile: {
  initial: { type: Number },
  mid:     { type: Number },
  late:    { type: Number },
  },
  kcInitial: {type: Number},
  kcMid: {type: Number},
  kcLate: {type: Number}
});

export default mongoose.model("Plant", plantSchema);