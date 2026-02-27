import { jest } from "@jest/globals";

// Tests for sendGoalAlertEmail Brevo integration
test("sendGoalAlertEmail uses Brevo when configured", async () => {
  jest.resetModules();

  process.env.EMAIL_PROVIDER = "brevo";
  process.env.BREVO_API_KEY = "test-brevo-key";
  process.env.BREVO_SENDER_EMAIL = "no-reply@example.com";
  process.env.BREVO_SENDER_NAME = "EcoTrack Test";
  process.env.REQUEST_TIMEOUT_MS = "2500";

  const axios = (await import("axios")).default;
  const postSpy = jest.spyOn(axios, "post").mockResolvedValue({ data: {} });

  const { sendGoalAlertEmail } = await import("../src/services/thirdparty.service.js");

  const res = await sendGoalAlertEmail({
    to: "user@example.com",
    subject: "Goal exceeded",
    text: "You have exceeded your goal.",
  });

  expect(postSpy).toHaveBeenCalledTimes(1);
  const [url, body, config] = postSpy.mock.calls[0];
  expect(url).toBe("https://api.brevo.com/v3/smtp/email");
  expect(body.sender.email).toBe("no-reply@example.com");
  expect(body.to[0].email).toBe("user@example.com");
  expect(body.subject).toBe("Goal exceeded");
  expect(body.textContent).toBe("You have exceeded your goal.");
  expect(config.headers["api-key"]).toBe("test-brevo-key");
  expect(res).toEqual({ sent: true, provider: "brevo" });
});

test("sendGoalAlertEmail returns brevo_not_configured when Brevo env is missing", async () => {
  jest.resetModules();

  process.env.EMAIL_PROVIDER = "brevo";
  process.env.BREVO_API_KEY = "";
  process.env.BREVO_SENDER_EMAIL = "";
  process.env.REQUEST_TIMEOUT_MS = "2500";

  const axios = (await import("axios")).default;
  const postSpy = jest.spyOn(axios, "post").mockResolvedValue({ data: {} });

  const { sendGoalAlertEmail } = await import("../src/services/thirdparty.service.js");

  const res = await sendGoalAlertEmail({
    to: "user@example.com",
    subject: "Goal exceeded",
    text: "You have exceeded your goal.",
  });

  expect(res.sent).toBe(false);
  expect(res.reason).toBe("brevo_not_configured");
  expect(postSpy).not.toHaveBeenCalled();
});

test("sendGoalAlertEmail handles Brevo failure gracefully", async () => {
  jest.resetModules();

  process.env.EMAIL_PROVIDER = "brevo";
  process.env.BREVO_API_KEY = "test-brevo-key";
  process.env.BREVO_SENDER_EMAIL = "no-reply@example.com";
  process.env.BREVO_SENDER_NAME = "EcoTrack Test";
  process.env.REQUEST_TIMEOUT_MS = "2500";

  const axios = (await import("axios")).default;
  const postSpy = jest.spyOn(axios, "post").mockRejectedValue(new Error("Brevo error"));

  const { sendGoalAlertEmail } = await import("../src/services/thirdparty.service.js");

  const res = await sendGoalAlertEmail({
    to: "user@example.com",
    subject: "Goal exceeded",
    text: "You have exceeded your goal.",
  });

  expect(postSpy).toHaveBeenCalledTimes(1);
  expect(res.sent).toBe(false);
  expect(res.reason).toBe("brevo_failed");
  expect(res.provider).toBe("brevo");
});
