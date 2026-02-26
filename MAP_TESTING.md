# Quick Start: Testing the Map Feature

## Prerequisites
1. Backend running with valid `OPENWEATHER_API_KEY` in `.env`
2. Frontend running (Vite dev server)
3. User account created and logged in

## Step-by-Step Test

### 1. Start Backend
```bash
cd backend
pnpm install  # if not already done
pnpm dev      # or pnpm start
```

Verify backend starts without errors and shows:
```
✓ MongoDB connected
✓ Server running on port 5000 (or configured port)
```

### 2. Start Frontend
```bash
cd frontend
pnpm install  # if not already done
pnpm dev
```

Verify frontend starts and shows:
```
✓ Local: http://localhost:5173/
```

### 3. Login
1. Navigate to `http://localhost:5173/login`
2. Login with existing credentials or create new account
3. You should see the Dashboard

### 4. Navigate to Map
1. Click **"Map"** in the navigation bar
2. The map page should load with:
   - Hero section with title "Environmental Map"
   - Three view mode buttons (Air Quality, Carbon Intensity, Weather)
   - Auto-refresh toggle
   - Manual refresh button
   - Color-coded legend
   - Interactive map with markers

### 5. Test View Modes

#### Air Quality View (Default)
- Green markers = Good air quality
- Lime markers = Fair
- Amber = Moderate
- Orange = Poor
- Red = Very Poor
- Click any marker to see PM2.5, PM10, NO₂, O₃ levels

#### Carbon Intensity View
- Click "Carbon Intensity" button
- Green markers = Low carbon (<100 gCO₂/kWh)
- Yellow = Medium (100-200)
- Orange = High (200-300)
- Red = Very High (>300)
- Only London shows carbon data (others show N/A)

#### Weather View
- Click "Weather" button
- Markers show temperature, conditions, humidity, wind
- Larger circles = warmer temperature
- Blue = Cold, Green = Mild, Orange = Warm, Red = Hot

### 6. Test Interactive Features

#### Popup Details
- Click any marker
- Popup should appear with:
  - City name
  - Relevant data for current view mode
  - Detailed metrics
- Click elsewhere to close popup

#### Manual Refresh
- Click "↻ Refresh" button
- Button should show "Refreshing..."
- Map data should reload
- "Last updated" timestamp should change

#### Auto-Refresh Toggle
- Click the toggle switch
- Green = Auto-refresh ON (5-minute intervals)
- Gray = Auto-refresh OFF
- Test by waiting 5+ minutes with toggle ON

### 7. Test Map Interactions
- **Pan**: Click and drag the map
- **Zoom**: Use mouse wheel or +/- buttons
- **Reset View**: Refresh the page to reset to default (London center)

## Expected Results

### All Markers Should Show:
1. London ✓ (with carbon intensity)
2. Paris ✓
3. Berlin ✓
4. Madrid ✓
5. Rome ✓
6. Amsterdam ✓
7. Brussels ✓
8. Vienna ✓
9. Stockholm ✓
10. Copenhagen ✓
11. Oslo ✓
12. Dublin ✓
13. Lisbon ✓
14. Athens ✓
15. Warsaw ✓
16. Prague ✓
17. Budapest ✓
18. Zurich ✓

### Data Verification
Check browser DevTools Network tab:
- Request to `/api/map/data` should return 200 OK
- Response should contain 18 locations
- Each location should have weather and airPollution data
- Only London should have gridIntensity value

## Troubleshooting

### No Markers Appear
1. Check browser console for errors
2. Verify API endpoint returns data: `GET http://localhost:5000/api/map/data`
3. Check `OPENWEATHER_API_KEY` is valid in backend `.env`
4. Check JWT token is valid (try logging out and back in)

### "Error loading map data"
1. Backend may not be running
2. CORS issue - verify CORS_ORIGINS in backend `.env`
3. Authentication failed - check token expiration
4. OpenWeather API rate limit exceeded

### Markers Show "N/A"
- **Air Pollution N/A**: OpenWeather API issue or rate limit
- **Carbon Intensity N/A**: Expected for non-UK cities
- **Weather N/A**: OpenWeather API issue

### Map Not Loading
1. Check `leaflet` CSS is imported in `index.css`
2. Browser console may show Leaflet errors
3. Try clearing browser cache
4. Verify `react-leaflet` and `leaflet` packages installed

### Popups Not Appearing
1. Leaflet z-index issue - check CSS
2. Click directly on marker center
3. Try different browsers

## API Response Example
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
          "tempC": 12.5,
          "condition": "Clear",
          "description": "clear sky",
          "windMs": 3.2,
          "humidityPct": 65,
          "lat": 51.5074,
          "lon": -0.1278
        },
        "airPollution": {
          "aqi": 2,
          "aqiLabel": "Fair",
          "co": 240.15,
          "no2": 18.23,
          "o3": 72.11,
          "pm2_5": 6.34,
          "pm10": 9.12,
          "so2": 3.45
        },
        "gridIntensity": 156
      }
    ],
    "timestamp": "2024-01-15T14:30:00.000Z"
  }
}
```

## Performance Notes
- Initial load: ~2-3 seconds (fetching data for 18 cities)
- Subsequent loads: Instant (React Query cache)
- Auto-refresh: Every 5 minutes
- Backend cache: 15 minutes per location

## Browser Compatibility
Tested on:
- ✓ Chrome/Edge (recommended)
- ✓ Firefox
- ✓ Safari
- Mobile browsers may have reduced performance

## Success Criteria
✅ Map displays with 18 markers  
✅ All three view modes work  
✅ Markers are color-coded correctly  
✅ Popups show detailed data  
✅ Auto-refresh toggles on/off  
✅ Manual refresh updates data  
✅ "Last updated" timestamp visible  
✅ Premium eco-theme consistent with app  
