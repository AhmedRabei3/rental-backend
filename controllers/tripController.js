const asyncHandler = require("express-async-handler");
const axios = require("axios");
const { Item } = require("../models/Item");

module.exports.recommendTrip = asyncHandler(async (req, res) => {
  const { country, tripType, budget, duration, preferences } = req.body;

  if (!country || !tripType || !budget) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    // 🔹 جلب الأماكن السياحية من OpenTripMap API
    const tripMapRes = await axios.get(
      `https://api.opentripmap.com/0.1/en/places/bbox`,
      {
        params: {
          lon_min: 35,
          lon_max: 42,
          lat_min: 32,
          lat_max: 37,
          kinds: tripType,
          apikey: process.env.OPENTRIPMAP_API_KEY,
        },
      }
    );

    const places = tripMapRes.data.features.map((place) => ({
      name: place.properties.name,
      coordinates: place.geometry.coordinates,
    }));

    if (places.length === 0) {
      return res
        .status(404)
        .json({ message: "No tourist places found in this category." });
    }

    // 🔹 البحث عن العناصر القريبة من الأماكن السياحية
    const rentalItems = await Item.find({
      "location.coordinates": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: places[0].coordinates,
          },
          $maxDistance: 50000, // 50 كم
        },
      },
      price: { $lte: budget },
    })
      .limit(5)
      .lean();

    // 🔹 حساب التكاليف التقديرية
    const totalRentalCost = rentalItems.reduce(
      (sum, item) => sum + item.price * duration,
      0
    );

    const estimatedCost = totalRentalCost;

    res.json({
      recommendedPlaces: places.slice(0, 5),
      rentalItems,
      estimatedCost,
    });
  } catch (error) {
    console.error("Error fetching trip recommendations:", error.message);
    res.status(500).json({ message: "Failed to fetch recommendations." });
  }
});
