import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import Navbar from "../components/Navbar";
import { IconLocation, IconRefresh } from "../components/Icons";

// Component to recenter map when data loads
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// Helper to get AQI color
function getAQIColor(aqi) {
  if (!aqi) return "#94a3b8"; // gray
  if (aqi === 1) return "#10b981"; // green - Good
  if (aqi === 2) return "#84cc16"; // lime - Fair
  if (aqi === 3) return "#f59e0b"; // amber - Moderate
  if (aqi === 4) return "#f97316"; // orange - Poor
  return "#ef4444"; // red - Very Poor
}

// Helper to get carbon intensity color
function getCarbonColor(intensity) {
  if (!intensity) return "#94a3b8"; // gray
  if (intensity < 100) return "#10b981"; // green - Low
  if (intensity < 200) return "#facc15"; // yellow - Medium
  if (intensity < 300) return "#f97316"; // orange - High
  return "#ef4444"; // red - Very High
}

export default function Map() {
  const [mapView, setMapView] = useState("airQuality"); // 'airQuality', 'carbon', 'weather'
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [coords, setCoords] = useState(null);
  const [geoError, setGeoError] = useState(() => {
    if (typeof navigator === "undefined") return "";
    return "geolocation" in navigator ? "" : "Geolocation is not supported in this browser.";
  });

  // Ask for current location (browser geolocation)
  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => {
        setGeoError(err?.message || "Location permission denied.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Fetch map data
  // Fallback data (predefined cities)
  const fallbackQ = useQuery({
    queryKey: ["mapData"],
    queryFn: async () => {
      const res = await api.get("/map/data");
      return res.data.data;
    },
    refetchInterval: autoRefresh ? 300000 : false, // 5 minutes
    staleTime: 300000,
  });

  // Nearby data (current location)
  const nearbyQ = useQuery({
    queryKey: ["mapNearby", coords?.lat, coords?.lon],
    enabled: !!coords?.lat && !!coords?.lon,
    queryFn: async () => {
      const res = await api.get("/map/nearby", {
        params: { lat: coords.lat, lon: coords.lon, cnt: 12 },
      });
      return res.data.data;
    },
    refetchInterval: autoRefresh ? 300000 : false,
    staleTime: 300000,
  });

  const activeData = nearbyQ.data || fallbackQ.data;
  const isLoading = (!!coords && nearbyQ.isLoading) || (!coords && fallbackQ.isLoading);
  const error = nearbyQ.isError ? nearbyQ.error : fallbackQ.isError ? fallbackQ.error : null;
  const refetch = () => {
    if (coords) nearbyQ.refetch();
    else fallbackQ.refetch();
  };

  const locations = useMemo(() => activeData?.locations || [], [activeData?.locations]);
  const center = useMemo(() => {
    if (coords?.lat && coords?.lon) return [coords.lat, coords.lon];
    if (locations.length > 0) return [locations[0].lat, locations[0].lon];
    return [51.5074, -0.1278];
  }, [coords, locations]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="px-4 pb-8 bg-gradient-to-br from-slate-950 via-emerald-950/20 to-cyan-950/20">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto mb-8 pt-8">
        <div className="text-center mb-8 space-y-3 animate-fade-in">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400">
            Environmental Map
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Real-time air quality, carbon intensity, and weather across major European cities
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 justify-center items-center mb-6">
          {/* View Toggle */}
          <div className="flex gap-2 bg-slate-900/60 backdrop-blur-md p-1.5 rounded-xl border border-emerald-500/30">
            <button
              onClick={() => setMapView("airQuality")}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                mapView === "airQuality"
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/50"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              Air Quality
            </button>
            <button
              onClick={() => setMapView("carbon")}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                mapView === "carbon"
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/50"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              Carbon Intensity
            </button>
            <button
              onClick={() => setMapView("weather")}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                mapView === "weather"
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/50"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              Weather
            </button>
          </div>

          {/* Auto Refresh Toggle */}
          <div className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-emerald-500/30">
            <span className="text-slate-300 text-sm font-medium">Auto-refresh</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                autoRefresh ? "bg-gradient-to-r from-emerald-500 to-cyan-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${
                  autoRefresh ? "translate-x-7" : ""
                }`}
              />
            </button>
          </div>

          {/* Manual Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/10 transition-all duration-300 disabled:opacity-50 font-medium"
          >
            <span className="inline-flex items-center gap-2">
              <IconRefresh width={18} height={18} className={isLoading ? "animate-spin" : ""} />
              {isLoading ? "Refreshing..." : "Refresh"}
            </span>
          </button>
        </div>

        {/* Location notice */}
        {geoError && (
          <div className="bg-slate-900/60 backdrop-blur-md border border-amber-500/30 rounded-xl p-4 mb-6 text-sm text-amber-200">
            <span className="inline-flex items-center gap-2">
              <IconLocation width={18} height={18} />
              <span>{geoError} Showing default locations.</span>
            </span>
          </div>
        )}

        {/* Legend */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 rounded-xl p-4 mb-6">
          <h3 className="text-slate-200 font-semibold mb-3">Legend</h3>
          <div className="flex flex-wrap gap-6">
            {mapView === "airQuality" && (
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500" />
                  <span className="text-slate-300 text-sm">Good</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-lime-500" />
                  <span className="text-slate-300 text-sm">Fair</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-500" />
                  <span className="text-slate-300 text-sm">Moderate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500" />
                  <span className="text-slate-300 text-sm">Poor</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <span className="text-slate-300 text-sm">Very Poor</span>
                </div>
              </div>
            )}
            {mapView === "carbon" && (
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500" />
                  <span className="text-slate-300 text-sm">&lt;100 gCO₂/kWh</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-400" />
                  <span className="text-slate-300 text-sm">100-200</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500" />
                  <span className="text-slate-300 text-sm">200-300</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <span className="text-slate-300 text-sm">&gt;300</span>
                </div>
              </div>
            )}
            {mapView === "weather" && (
              <div className="text-slate-300 text-sm">
                Circle size indicates temperature (larger = warmer)
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Map Container */}
        <div className="max-w-7xl mx-auto">
        <div className="bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/10">
          {error && (
            <div className="p-8 text-center">
              <p className="text-red-400">Error loading map data</p>
              <button
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {isLoading && !activeData && (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
              <p className="text-slate-300 mt-4">Loading environmental data...</p>
            </div>
          )}

          {!isLoading && !error && locations.length > 0 && (
            <MapContainer
              center={center}
              zoom={4}
              style={{ height: "600px", width: "100%" }}
              className="z-0"
            >
              <MapRecenter center={center} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Current location marker */}
              {coords?.lat && coords?.lon && (
                <CircleMarker
                  center={[coords.lat, coords.lon]}
                  radius={10}
                  pathOptions={{ color: "#ffffff", fillColor: "#ffffff", fillOpacity: 0.7, weight: 2 }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-lg mb-1">You are here</h3>
                      <div className="text-sm text-slate-300">
                        Lat: {coords.lat.toFixed(4)} · Lon: {coords.lon.toFixed(4)}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              )}

              {locations.map((loc, idx) => {
                let color, radius, popupContent;

                if (mapView === "airQuality") {
                  const aqi = loc.airPollution?.aqi;
                  color = getAQIColor(aqi);
                  radius = aqi ? 10 + aqi * 2 : 10;
                  popupContent = (
                    <div className="p-2">
                      <h3 className="font-bold text-lg mb-2">{loc.name}</h3>
                      <div className="space-y-1">
                        <p>
                          <strong>Air Quality:</strong> {loc.airPollution?.aqiLabel || "N/A"}
                        </p>
                        {loc.airPollution && (
                          <>
                            <p>
                              <strong>PM2.5:</strong> {loc.airPollution.pm2_5?.toFixed(1)} μg/m³
                            </p>
                            <p>
                              <strong>PM10:</strong> {loc.airPollution.pm10?.toFixed(1)} μg/m³
                            </p>
                            <p>
                              <strong>NO₂:</strong> {loc.airPollution.no2?.toFixed(1)} μg/m³
                            </p>
                            <p>
                              <strong>O₃:</strong> {loc.airPollution.o3?.toFixed(1)} μg/m³
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                } else if (mapView === "carbon") {
                  const intensity = loc.gridIntensity;
                  color = getCarbonColor(intensity);
                  radius = intensity ? Math.min(20, 10 + intensity / 20) : 10;
                  popupContent = (
                    <div className="p-2">
                      <h3 className="font-bold text-lg mb-2">{loc.name}</h3>
                      <div className="space-y-1">
                        <p>
                          <strong>Carbon Intensity:</strong>{" "}
                          {intensity ? `${intensity} gCO₂/kWh` : "N/A"}
                        </p>
                        {intensity && (
                          <p className="text-sm mt-2">
                            {intensity < 100
                              ? "Low carbon electricity"
                              : intensity < 200
                              ? "Medium carbon intensity"
                              : intensity < 300
                              ? "High carbon content"
                              : "Very high carbon intensity"}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  // weather
                  const temp = loc.weather?.tempC;
                  color = temp
                    ? temp < 10
                      ? "#3b82f6"
                      : temp < 20
                      ? "#10b981"
                      : temp < 30
                      ? "#f59e0b"
                      : "#ef4444"
                    : "#94a3b8";
                  radius = temp ? Math.min(20, 8 + temp / 2) : 10;
                  popupContent = (
                    <div className="p-2">
                      <h3 className="font-bold text-lg mb-2">{loc.name}</h3>
                      <div className="space-y-1">
                        <p>
                          <strong>Temperature:</strong> {temp?.toFixed(1)}°C
                        </p>
                        <p>
                          <strong>Condition:</strong> {loc.weather?.condition || "N/A"}
                        </p>
                        <p>
                          <strong>Humidity:</strong> {loc.weather?.humidityPct}%
                        </p>
                        <p>
                          <strong>Wind:</strong> {loc.weather?.windMs?.toFixed(1)} m/s
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <CircleMarker
                    key={idx}
                    center={[loc.lat, loc.lon]}
                    radius={radius}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: 0.6,
                      weight: 2,
                    }}
                  >
                    <Popup>{popupContent}</Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          )}
        </div>

        {/* Last Updated */}
        {activeData?.timestamp && (
          <div className="text-center mt-4">
            <p className="text-slate-400 text-sm">
              Last updated: {new Date(activeData.timestamp).toLocaleString()}
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
