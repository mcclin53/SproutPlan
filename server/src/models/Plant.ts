import mongoose from "mongoose";

const plantSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

export default mongoose.model("Plant", plantSchema);