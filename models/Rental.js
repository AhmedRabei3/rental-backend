const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: {
      type: String,
      enum: [
        "pending_approval",
        "approved",
        "canceled",
        "redy",
        "reject",
        "active",
        "teminated",
      ],
      default: "redy",
    },
    rentalSecureDeposit: { type: Number, required: true, default: 0 },
    preReservationDeposit: { type: Number, default: 0 },
    isPreReserved: { type: Boolean, default: false },
    platformFee: { type: Number, required: true },
    rejectionReason: {
      type: String,
      default: null,
    },
    expirationDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Rental = mongoose.model("Rental", rentalSchema);
module.exports = { Rental };
