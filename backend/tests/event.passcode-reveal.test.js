import { describe, it, expect } from "vitest";
import request from "supertest";
import "./setup.js";

process.env.JWT_SECRET = "test-secret-key-for-vitest-only";
process.env.NODE_ENV = "test";
process.env.PASSCODE_ENCRYPTION_KEY =
  process.env.PASSCODE_ENCRYPTION_KEY || "0".repeat(64); // valid 32-byte hex for tests only

const { default: app } = await import("../src/app.js");

const registerAndLogin = async (email) => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Test User", email, password: "password123" });
  return res.body.data.token;
};

const createEvent = async (token) => {
  const res = await request(app)
    .post("/api/events")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Reveal Test Event",
      date: new Date(Date.now() + 86400000).toISOString(),
      expiryDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    });
  return { eventId: res.body.data.event._id, passcode: res.body.data.passcode };
};

describe("Organizer passcode reveal (anytime access, backend-enforced)", () => {
  it("lets the organizer decrypt and view the passcode again after creation", async () => {
    const organizerToken = await registerAndLogin("revealorg@test.com");
    const { eventId, passcode } = await createEvent(organizerToken);

    const res = await request(app)
      .get(`/api/events/${eventId}/passcode`)
      .set("Authorization", `Bearer ${organizerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.passcode).toBe(passcode);
    expect(res.body.data.needsRegeneration).toBe(false);
  });

  it("blocks a non-organizer from revealing the passcode, even a joined participant", async () => {
    const organizerToken = await registerAndLogin("revealorg2@test.com");
    const participantToken = await registerAndLogin("participant@test.com");
    const { eventId, passcode } = await createEvent(organizerToken);

    await request(app)
      .post(`/api/events/${eventId}/join`)
      .set("Authorization", `Bearer ${participantToken}`)
      .send({ passcode });

    const res = await request(app)
      .get(`/api/events/${eventId}/passcode`)
      .set("Authorization", `Bearer ${participantToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("NOT_EVENT_OWNER");
  });

  it("blocks an unauthenticated request outright", async () => {
    const organizerToken = await registerAndLogin("revealorg3@test.com");
    const { eventId } = await createEvent(organizerToken);

    const res = await request(app).get(`/api/events/${eventId}/passcode`);
    expect(res.status).toBe(401);
  });

  it("lets the organizer regenerate a passcode, which then verifies correctly on join", async () => {
    const organizerToken = await registerAndLogin("revealorg4@test.com");
    const participantToken = await registerAndLogin("participant2@test.com");
    const { eventId, passcode: oldPasscode } = await createEvent(organizerToken);

    const regenRes = await request(app)
      .post(`/api/events/${eventId}/passcode/regenerate`)
      .set("Authorization", `Bearer ${organizerToken}`);
    expect(regenRes.status).toBe(200);
    const newPasscode = regenRes.body.data.passcode;
    expect(newPasscode).not.toBe(oldPasscode);

    // Old passcode no longer works
    const oldJoin = await request(app)
      .post(`/api/events/${eventId}/join`)
      .set("Authorization", `Bearer ${participantToken}`)
      .send({ passcode: oldPasscode });
    expect(oldJoin.status).toBe(400);

    // New passcode works
    const newJoin = await request(app)
      .post(`/api/events/${eventId}/join`)
      .set("Authorization", `Bearer ${participantToken}`)
      .send({ passcode: newPasscode });
    expect(newJoin.status).toBe(200);

    // And the new passcode can be revealed again afterwards
    const revealRes = await request(app)
      .get(`/api/events/${eventId}/passcode`)
      .set("Authorization", `Bearer ${organizerToken}`);
    expect(revealRes.body.data.passcode).toBe(newPasscode);
  });
});
