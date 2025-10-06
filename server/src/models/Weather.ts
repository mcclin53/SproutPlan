import mongoose from "mongoose";

const weatherSchema = new mongoose.Schema({
    temp: {type: Number},
    
});
export default mongoose.model("Weather", weatherSchema);