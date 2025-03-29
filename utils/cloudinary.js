const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// حذف صورة واحدة من Cloudinary باستخدام public_id
module.exports.cloudinaryDeleteImage = (public_id) => {
  return cloudinary.uploader.destroy(public_id);
};

// حذف عدة صور دفعة واحدة من Cloudinary
module.exports.cloudinaryDeleteImages = async (images) => {
  try {
    if (!images || images.length === 0) return;
    const publicIds = images.map((img) => img.public_id).filter(Boolean);
    if (publicIds.length > 0) {
      await cloudinary.api.delete_resources(publicIds);
    }
  } catch (error) {
    throw new Error("فشل حذف الصور من Cloudinary: " + error.message);
  }
};

module.exports.cloudinaryUploadImage = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: "profile-photos",
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          return reject(
            new Error("فشل رفع الصورة إلى Cloudinary: " + error.message)
          );
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );

    uploadStream.end(fileBuffer); // إرسال الملف إلى Cloudinary
  });
};
// رفع عدة صورة معاً
module.exports.cloudinaryUploadImages = async (fileBuffers) => {
  try {
    const uploadPromises = fileBuffers.map((fileBuffer) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "image",
            folder: "profile-photos",
            overwrite: true,
          },
          (error, result) => {
            if (error) {
              console.error("❌ فشل رفع الصورة:", error.message);
              return reject(
                new Error("فشل رفع الصورة إلى Cloudinary: " + error.message)
              );
            }
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
            });
          }
        );
        uploadStream.end(fileBuffer); // إرسال الملف إلى Cloudinary
      });
    });

    // تنفيذ جميع عمليات الرفع بالتوازي
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error("❌ خطأ أثناء رفع الصور:", error.message);
    throw new Error("حدث خطأ أثناء رفع الصور");
  }
};
