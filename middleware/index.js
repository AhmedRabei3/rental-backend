const { verifyToken } = require("./verifyToken");
const {
  isAdmin,
  isOwnerOrAdmin,
  isUser,
  isValidId,
} = require("./verification");
module.exports.middleware = {
  verifyToken,
  isAdmin,
  isUser,
  isOwnerOrAdmin,
  isValidId,
};
