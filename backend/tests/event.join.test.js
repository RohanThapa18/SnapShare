import { describe, it, expect } from "vitest";
import request from "supertest";
import "./setup.js";

process.env.JWT_SECRET = "test-secret-key-for-vitest-only";
process.env.NODE_ENV = "test";

const { default: app } = await import("../src/app.js");

const registerAndLogin = async (email) => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Test User", email, password: "password123" });
  return res.body.data.token;
};

const createEvent = async (organizerToken, overrides = {}) => {
  const res = await request(app)
    .post("/api/events")
    .set("Authorization", `Bearer ${organizerToken}`)
    .send({
      title: "Passcode Test Event",
      date: new Date(Date.now() + 86400000).toISOString(),
      expiryDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      ...overrides,
    });
  return { event: res.body.data.event, passcode: res.body.data.passcode };
};

describe("Event join flow", () => {
  it("joins successfully with the correct passcode", async () => {
    const organizerToken = await registerAndLogin("join-organizer1@test.com");
    const participantToken = await registerAndLogin("join-participant1@test.com");
    const { event, passcode } = await createEvent(organizerToken);

    const res = await request(app)
      .post(`/api/events/${event._id}/join`)
      .set("Authorization", `Bearer ${participantToken}`)
      .send({ passcode });

    expect(res.status).toBe(200);
  });

  it("rejects joining with an incorrect passcode", async () => {
    const organizerToken = await registerAndLogin("join-organizer2@test.com");
    const participantToken = await registerAndLogin("join-participant2@test.com");
    const { event } = await createEvent(organizerToken);

    const res = await request(app)
      .post(`/api/events/${event._id}/join`)
      .set("Authorization", `Bearer ${participantToken}`)
      .send({ passcode: "WRONG1" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_PASSCODE");
  });

  it("stores the passcode hashed, never in plaintext", async () => {
    const organizerToken = await registerAndLogin("join-organizer3@test.com");
    const { event } = await createEvent(organizerToken);

    const { Event } = await import("../src/models/index.js");
    const stored = await Event.findById(event._id).select("+passcodeHash");
    expect(stored.passcodeHash).toBeDefined();
    expect(stored.passcodeHash).not.toMatch(/^[A-Z0-9]{6}$/); // not plaintext format
  });

  it("blocks joining an expired event", async () => {
    const organizerToken = await registerAndLogin("join-organizer4@test.com");
    const participantToken = await registerAndLogin("join-participant4@test.com");

    // Create with an expiry in the near future, then manually expire it
    const { event, passcode } = await createEvent(organizerToken, {
      date: new Date(Date.now() - 2000).toISOString(),
      expiryDate: new Date(Date.now() + 1000).toISOString(),
    });

    const { Event } = await import("../src/models/index.js");
    await Event.findByIdAndUpdate(event._id, { expiryDate: new Date(Date.now() - 1000) });

    const res = await request(app)
      .post(`/api/events/${event._id}/join`)
      .set("Authorization", `Bearer ${participantToken}`)
      .send({ passcode });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("EVENT_EXPIRED");
  });

  it("joins successfully via the opaque QR join token", async () => {
    const organizerToken = await registerAndLogin("join-organizer5@test.com");
    const participantToken = await registerAndLogin("join-participant5@test.com");
    const { event } = await createEvent(organizerToken);

    const { Event } = await import("../src/models/index.js");
    const fullEvent = await Event.findById(event._id);

    const res = await request(app)
      .post(`/api/events/${event._id}/join`)
      .set("Authorization", `Bearer ${participantToken}`)
      .send({ joinToken: fullEvent.joinToken });

    expect(res.status).toBe(200);
  });
});
