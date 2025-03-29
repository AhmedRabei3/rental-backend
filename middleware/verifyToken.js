const jwt = require("jsonwebtoken");

module.exports.verifyToken = async (req, res, next) => {
  const head = req.headers.authorization;
  if (!head)
    return res
      .status(401)
      .json({ message: "Access denied. No token provided , please login " });
  const token = head.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
