const { User } = require("../models/User");
const mongoose = require("mongoose");
const { Item } = require("../models/Item");
const { equal } = require("joi");
// verify if is admin
module.exports.isAdmin = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user?.role === "admin" || !user) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};
module.exports.isUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Error", error });
  }
};

// id validations
module.exports.isValidId = async (req, res, next) => {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }
  next();
};
// is owner of item or Admin
module.exports.isOwnerOrAdmin = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    if (!item.owner.equals(req.user.id) || req.user.role === "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    req.item = item;
    next();
  } catch (error) {
    console.error("Error in isOwner middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
