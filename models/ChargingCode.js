const mongoose = require("mongoose");

const chargingCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  balance: {
    type: Number,
    required: true,
  },
});

const ChargingCode = mongoose.model("ChargingCode", chargingCodeSchema);

module.exports = ChargingCode;
