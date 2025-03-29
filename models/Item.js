const mongoose = require("mongoose");
const {
  itemSchemaFunctions,
  createItemValidation,
} = require("../utils/itemSchemaFunctions");

// تعريف الـ Schema للأشياء
const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 150 },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Category",
    },
    condition: {
      type: String,
      required: true,
      enum: ["new", "good", "used", "damaged"],
    },
    rentalType: {
      type: String,
      required: true,
      enum: ["hourly", "daily", "weekly", "monthly", "yearly", "half-year"],
    },
    price: { type: Number, required: true, min: 1 },
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function (val) {
            return val.length === 2;
          },
          message:
            "Coordinates must have exactly 2 values: [longitude, latitude]",
        },
      },
      street: { type: String, trim: true },
      city: { type: String, trim: true, index: true },
      country: { type: String, trim: true },
    },
    averageRating: { type: Number, default: 0 },
    likes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    rentalPeriods: {
      type: [
        {
          startDate: { type: Date, required: true },
          endDate: { type: Date, required: true },
        },
      ],
      default: [],
    },
    blockedDates: {
      type: [
        {
          startDate: { type: Date, required: true },
          endDate: { type: Date, required: true },
        },
      ],
      default: [],
    },
    availablePeriods: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
      },
    ],
    preReservationDeposit: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

itemSchemaFunctions(itemSchema);
const Item = mongoose.model("Item", itemSchema);
createItemValidation(Item);
module.exports = { Item, itemSchema };
