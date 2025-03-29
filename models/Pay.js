const mongoose = require("mongoose");
const { User } = require("./User");
const Joi = require("joi");

const payToSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    payedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    payedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

payToSchema.methods.pay = async function () {
  const payedTo = await User.findById(this.payedTo);
  const payedBy = await User.findById(this.payedBy);
  if (payedBy.balance < this.amount) {
    throw new Error("Insufficient balance");
  }
  payedTo.balance += this.amount;
  payedBy.balance -= this.amount;
  await payedTo.save();
  await payedBy.save();
  return this;
};

const PayTo = mongoose.model("PayTo", payToSchema);

function payToValidation(payTo) {
  const schema = Joi.object({
    amount: Joi.number().required(),
    description: Joi.string().trim(),
    payedTo: Joi.required(),
  });
  return schema.validate(payTo);
}
module.exports = { PayTo, payToValidation };
