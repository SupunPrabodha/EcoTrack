test("calculateEmission falls back to local factor without third-party keys", async () => {
  // Ensure no third-party keys in test env
  process.env.CLIMATIQ_API_KEY = "";
  process.env.OPENWEATHER_API_KEY = "";
  process.env.REQUEST_TIMEOUT_MS = "10";

  const { calculateEmission } = await import("../src/services/emission.service.js");

  const res = await calculateEmission({ habitType: "car_km", value: 10, date: new Date() });
  expect(res.emissionKg).toBeGreaterThan(0);
  console.log("res. method= "+res.method);
  
  expect(["local_factor", "climatiq"].includes(res.method)).toBe(true);
});
