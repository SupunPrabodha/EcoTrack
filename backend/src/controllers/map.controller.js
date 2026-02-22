import { asyncHandler } from "../utils/asyncHandler.js";
import * as thirdpartyService from "../services/thirdparty.service.js";

// Predefined locations for map view (can be expanded or made dynamic)
const DEFAULT_LOCATIONS = [
  { name: "London", lat: 51.5074, lon: -0.1278, region: "1" },
  { name: "Paris", lat: 48.8566, lon: 2.3522, region: null },
  { name: "Berlin", lat: 52.5200, lon: 13.4050, region: null },
  { name: "Madrid", lat: 40.4168, lon: -3.7038, region: null },
  { name: "Rome", lat: 41.9028, lon: 12.4964, region: null },
  { name: "Amsterdam", lat: 52.3676, lon: 4.9041, region: null },
  { name: "Brussels", lat: 50.8503, lon: 4.3517, region: null },
  { name: "Vienna", lat: 48.2082, lon: 16.3738, region: null },
  { name: "Stockholm", lat: 59.3293, lon: 18.0686, region: null },
  { name: "Copenhagen", lat: 55.6761, lon: 12.5683, region: null },
  { name: "Oslo", lat: 59.9139, lon: 10.7522, region: null },
  { name: "Dublin", lat: 53.3498, lon: -6.2603, region: null },
  { name: "Lisbon", lat: 38.7223, lon: -9.1393, region: null },
  { name: "Athens", lat: 37.9838, lon: 23.7275, region: null },
  { name: "Warsaw", lat: 52.2297, lon: 21.0122, region: null },
  { name: "Prague", lat: 50.0755, lon: 14.4378, region: null },
  { name: "Budapest", lat: 47.4979, lon: 19.0402, region: null },
  { name: "Zurich", lat: 47.3769, lon: 8.5417, region: null },
];

// GET /api/map/data - Get environmental data for multiple locations
export const getMapData = asyncHandler(async (req, res) => {
  const locations = DEFAULT_LOCATIONS;

  const data = await Promise.all(
    locations.map(async (loc) => {
      const [weather, airPollution, gridIntensity] = await Promise.all([
        thirdpartyService.getWeatherByCoords(loc.lat, loc.lon),
        thirdpartyService.getAirPollution(loc.lat, loc.lon),
        loc.region ? thirdpartyService.getGridCarbonIntensity({ region: loc.region }) : null,
      ]);

      return {
        name: loc.name,
        lat: loc.lat,
        lon: loc.lon,
        weather,
        airPollution,
        gridIntensity,
      };
    })
  );

  res.json({
    success: true,
    data: {
      locations: data,
      timestamp: new Date().toISOString(),
    },
  });
});

// GET /api/map/location - Get data for a specific location
export const getLocationData = asyncHandler(async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({
      success: false,
      message: "Latitude and longitude are required",
    });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({
      success: false,
      message: "Invalid latitude or longitude",
    });
  }

  const [weather, airPollution, gridIntensity] = await Promise.all([
    thirdpartyService.getWeatherByCoords(latitude, longitude),
    thirdpartyService.getAirPollution(latitude, longitude),
    thirdpartyService.getGridCarbonIntensity({ region: req.query.region }),
  ]);

  res.json({
    success: true,
    data: {
      lat: latitude,
      lon: longitude,
      weather,
      airPollution,
      gridIntensity,
      timestamp: new Date().toISOString(),
    },
  });
});

// GET /api/map/nearby - Get nearby places (based on user's current location)
export const getNearbyData = asyncHandler(async (req, res) => {
  const { lat, lon, cnt } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({
      success: false,
      message: "Latitude and longitude are required",
    });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({
      success: false,
      message: "Invalid latitude or longitude",
    });
  }

  const places = await thirdpartyService.getNearbyPlacesWeather(latitude, longitude, { cnt });

  const locations = await Promise.all(
    places.map(async (p) => {
      const airPollution = await thirdpartyService.getAirPollution(p.lat, p.lon);
      return {
        name: p.name,
        lat: p.lat,
        lon: p.lon,
        weather: p.weather,
        airPollution,
        gridIntensity: null,
      };
    })
  );

  res.json({
    success: true,
    data: {
      center: { lat: latitude, lon: longitude },
      locations,
      timestamp: new Date().toISOString(),
    },
  });
});
