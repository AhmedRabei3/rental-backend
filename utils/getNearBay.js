const { Item } = require("../models/Item");

// هذه الدالة تقوم بإرجاع العناصر القريبة من موقع معين
module.exports.getNearbyItems = async (longitude, latitude, maxDistance) => {
  const items = await Item.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
  });
  return items;
};
// استخدام الدالة مع إحداثيات معينة (دمشق، سوريا)
getNearbyItems(36.3008, 33.5138).then((items) => {
  console.log("العناصر القريبة:", items);
});
