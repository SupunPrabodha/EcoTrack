import { setupTestApp, teardownTestApp } from "./testUtils.js";
import { Habit } from "../src/models/Habit.js";
import { buildRecommendations } from "../src/services/recommendation.service.js";

let mongo;

beforeAll(async () => {
  const setup = await setupTestApp();
  mongo = setup.mongo;
});

afterAll(async () => {
  await teardownTestApp(mongo);
});

test("recommendation logic returns tips based on habits", async () => {
  const userId = (await Habit.create({
    userId: "000000000000000000000001",
    type: "car_km",
    value: 100,
    emissionKg: 21,
    date: new Date(),
  })).userId;

  await Habit.create({ userId, type: "electricity_kwh", value: 50, emissionKg: 40, date: new Date() });
  await Habit.create({ userId, type: "meat_meals", value: 10, emissionKg: 25, date: new Date() });

  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const to = new Date();

  const res = await buildRecommendations(userId, from, to);
  expect(res.tips.length).toBeGreaterThan(0);
  expect(res.tips.some((t) => t.title.toLowerCase().includes("car"))).toBe(true);
});
