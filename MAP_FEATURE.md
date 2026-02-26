# Environmental Map Feature - Implementation Summary

## Overview
Added an interactive environmental map to EcoTrack that displays real-time air quality, carbon intensity, and weather data across major European cities.

## Features
✅ **Interactive Map View** - Uses Leaflet for smooth, responsive map interactions
✅ **Three Data Layers**:
  - **Air Quality** - AQI index (1-5) with PM2.5, PM10, NO₂, O₃, SO₂, CO levels
  - **Carbon Intensity** - Grid carbon intensity (gCO₂/kWh) for locations with regional data
  - **Weather** - Temperature, conditions, humidity, wind speed
✅ **Real-time Updates** - Auto-refresh every 5 minutes (toggle on/off)
✅ **Color-coded Markers** - Visual indicators for data severity/intensity
✅ **Interactive Popups** - Click markers to see detailed environmental data
✅ **Responsive Legend** - Dynamic legend based on active layer
✅ **Premium UI** - Eco-themed design consistent with the rest of the app

## Backend Changes

### New Files
1. **`backend/src/controllers/map.controller.js`**
   - `getMapData()` - Returns environmental data for 18 predefined European cities
   - `getLocationData()` - Returns data for custom lat/lon coordinates
   
2. **`backend/src/routes/map.routes.js`**
   - `GET /api/map/data` - Protected endpoint for all locations
   - `GET /api/map/location?lat=X&lon=Y&region=Z` - Protected endpoint for specific location

### Modified Files
1. **`backend/src/services/thirdparty.service.js`**
   - Added `getAirPollution(lat, lon)` - Fetches OpenWeather Air Pollution API data
   - Added `getWeatherByCoords(lat, lon)` - Fetches weather by coordinates
   - Added location-based caching for air pollution data (15-min TTL)
   - Cache structure: `airPollution` Map with "lat,lon" keys

2. **`backend/src/app.js`**
   - Added `import mapRoutes` and registered `/api/map` route

## Frontend Changes

### New Files
1. **`frontend/src/pages/Map.jsx`**
   - Full-screen interactive map component
   - Three view modes: Air Quality, Carbon Intensity, Weather
   - Auto-refresh toggle and manual refresh button
   - Dynamic legend based on active layer
   - Color-coded CircleMarkers with size based on data intensity
   - Popup tooltips with detailed environmental data
   - React Query integration for data fetching and caching

### Modified Files
1. **`frontend/src/App.jsx`**
   - Added Map import and `/map` route

2. **`frontend/src/components/Navbar.jsx`**
   - Added "Map" navigation link

3. **`frontend/src/index.css`**
   - Added Leaflet CSS import
   - Added custom Leaflet popup styles (glass-morphism theme)

### New Dependencies
- `react-leaflet` v5.0.0 - React bindings for Leaflet
- `leaflet` v1.9.4 - Interactive map library

## API Endpoints

### GET /api/map/data
**Description**: Get environmental data for 18 predefined European cities  
**Authentication**: Required (JWT Bearer token)  
**Response**:
```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "name": "London",
        "lat": 51.5074,
        "lon": -0.1278,
        "weather": {
          "city": "London",
          "tempC": 15.3,
          "condition": "Clouds",
          "description": "overcast clouds",
          "windMs": 4.5,
          "humidityPct": 78,
          "lat": 51.5074,
          "lon": -0.1278
        },
        "airPollution": {
          "aqi": 2,
          "aqiLabel": "Fair",
          "co": 230.31,
          "no2": 15.89,
          "o3": 68.42,
          "pm2_5": 5.12,
          "pm10": 7.89,
          "so2": 2.34
        },
        "gridIntensity": 142
      }
      // ... more locations
    ],
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /api/map/location?lat=X&lon=Y&region=Z
**Description**: Get environmental data for a specific location  
**Authentication**: Required  
**Query Parameters**:
- `lat` (required) - Latitude
- `lon` (required) - Longitude
- `region` (optional) - Region ID for carbon intensity (e.g., "1" for London)

**Response**: Same structure as single location from `/api/map/data`

## Predefined Locations
The map displays data for 18 major European cities:
- London, Paris, Berlin, Madrid, Rome
- Amsterdam, Brussels, Vienna, Stockholm, Copenhagen
- Oslo, Dublin, Lisbon, Athens, Warsaw
- Prague, Budapest, Zurich

## Color Coding System

### Air Quality (AQI)
- 🟢 Green (AQI 1): Good
- 🟢 Lime (AQI 2): Fair
- 🟡 Amber (AQI 3): Moderate
- 🟠 Orange (AQI 4): Poor
- 🔴 Red (AQI 5): Very Poor

### Carbon Intensity
- 🟢 Green: <100 gCO₂/kWh (Low)
- 🟡 Yellow: 100-200 gCO₂/kWh (Medium)
- 🟠 Orange: 200-300 gCO₂/kWh (High)
- 🔴 Red: >300 gCO₂/kWh (Very High)

### Weather (Temperature)
- 🔵 Blue: <10°C (Cold)
- 🟢 Green: 10-20°C (Mild)
- 🟠 Orange: 20-30°C (Warm)
- 🔴 Red: >30°C (Hot)

## Caching Strategy
All third-party API calls are cached to minimize API usage:
- **Weather**: 15 minutes TTL per city
- **Air Pollution**: 15 minutes TTL per location (lat/lon rounded to 2 decimals)
- **Carbon Intensity**: 15 minutes TTL per region
- **Failed requests**: 1 minute negative cache

## Performance Optimizations
1. **Parallel data fetching**: All location data fetched concurrently using `Promise.all()`
2. **React Query caching**: Frontend caches map data with 5-minute stale time
3. **useMemo hooks**: Prevents unnecessary re-renders when calculating locations/center
4. **Conditional rendering**: Map only renders when data is available
5. **Auto-refresh toggle**: Users can disable auto-refresh to save bandwidth

## Usage
1. **Navigate to Map**: Click "Map" in the navigation bar
2. **Select View Mode**: Choose Air Quality, Carbon Intensity, or Weather
3. **Interact**: Click any marker to see detailed environmental data
4. **Refresh**: Toggle auto-refresh or click manual refresh button
5. **Explore**: Pan and zoom the map to explore different regions

## Environment Variables Required
Ensure these are set in `backend/.env`:
```env
OPENWEATHER_API_KEY=your_api_key_here
CARBON_INTENSITY_BASE_URL=https://api.carbonintensity.org.uk
```

## Testing
1. **Backend**: Test endpoints with authenticated requests to `/api/map/data` and `/api/map/location`
2. **Frontend**: Navigate to `/map` and verify markers appear, popups work, and view modes switch correctly
3. **Real-time**: Wait 5 minutes to verify auto-refresh works, or click manual refresh

## Known Limitations
1. **Geographic Coverage**: Predefined to 18 European cities (can be expanded)
2. **Carbon Intensity**: Only available for UK locations (region parameter required)
3. **API Rate Limits**: OpenWeather free tier has daily limits (caching mitigates this)
4. **Mobile Performance**: Large map may be slow on older devices

## Future Enhancements
- [ ] User-defined custom locations
- [ ] Historical data comparison
- [ ] Heatmap layer for pollution density
- [ ] Geolocation to show user's current location
- [ ] Export map data as CSV/JSON
- [ ] Integration with user's tracked emissions
- [ ] Alerts for poor air quality in user's region
- [ ] Global coverage (expand beyond Europe)
