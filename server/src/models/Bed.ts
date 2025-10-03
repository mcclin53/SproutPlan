import mongoose from "mongoose";

const bedSchema = new mongoose.Schema({
  width: { type: Number, required: true },
  length: { type: Number, required: true },
  plants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Plant" }],
});

export default mongoose.model("Bed", bedSchema);