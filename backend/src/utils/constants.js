export const ROLES = Object.freeze({
  USER: "user",
  ADMIN: "admin",
});

export const HABIT_TYPES = Object.freeze([
  "car_km",
  "public_transport_km",
  "electricity_kwh",
  "meat_meals",
  "plastic_items"
]);

// Basic default emission factors (kg CO2e per unit)
// You can later fetch dynamic factors from Carbon Interface API if needed
export const EMISSION_FACTORS = Object.freeze({
  car_km: 0.21,
  public_transport_km: 0.08,
  electricity_kwh: 0.85,
  meat_meals: 2.5,
  plastic_items: 0.06
});
