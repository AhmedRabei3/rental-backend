const axios = require("axios");

module.exports.getAddressFromCoordinates = async (lat, lon) => {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse`,
      {
        params: {
          lat,
          lon,
          format: "json",
        },
        headers: {
          "User-Agent": "RentalAppSyr (ahmrabia@hotmail.com)",
        },
        timeout: 5000,
      }
    );
    const data = response.data;
    if (data && data.address) {
      const { road, city, town, village, state, country } = data.address;
      return {
        street: road || "unknown",
        city: city || town || village || state || "unknown",
        country: country || "unknown",
      };
    }
    return { street: "unknown", city: "unknown", country: "unknown" };
  } catch (error) {
    console.error("❌ Error fetching address:", error.message);
    return { street: "unknown", city: "unknown", country: "unknown" };
  }
};
