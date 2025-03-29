module.exports = (req, res, next) => {
  if (req.is("multipart/form-data") && req.files && req.files.length > 0) {
    req.updateType = "withImages"; // تحديث مع صور
  } else {
    req.updateType = "dataOnly";
  }
  next();
};
