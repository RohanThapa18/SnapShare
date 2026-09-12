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
      title: "Lifecycle Test Event",
      date: new Date(Date.now() + 86400000).toISOString(),
      expiryDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      ...overrides,
    });
  return { event: res.body.data.event, passcode: res.body.data.passcode };
};

describe("Leave event", () => {
  it("lets a participant leave", async () => {
    const organizerToken = await registerAndLogin("leave-organizer1@test.com");
    const participantToken = await registerAndLogin("leave-participant1@test.com");
    const { event, passcode } = await createEvent(organizerToken);

    await request(app)
      .post(`/api/events/${event._id}/join`)
      .set("Authorization", `Bearer ${participantToken}`)
      .send({ passcode });

    const leaveRes = await request(app)
      .post(`/api/events/${event._id}/leave`)
      .set("Authorization", `Bearer ${participantToken}`);
    expect(leaveRes.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/events/${event._id}`)
      .set("Authorization", `Bearer ${participantToken}`);
    expect(getRes.body.data.viewerAccess.isParticipant).toBe(false);
  });

  it("lets a photographer leave and removes both photographer and participant status", async () => {
    const organizerToken = await registerAndLogin("leave-organizer2@test.com");
    const photographerToken = await registerAndLogin("leave-photog2@test.com");
    const { event } = await createEvent(organizerToken);

    await request(app)
      .post(`/api/events/${event._id}/join-as-photographer`)
      .set("Authorization", `Bearer ${photographerToken}`)
      .send({ photographerToken: event.photographerJoinToken });

    const leaveRes = await request(app)
      .post(`/api/events/${event._id}/leave`)
      .set("Authorization", `Bearer ${photographerToken}`);
    expect(leaveRes.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/events/${event._id}`)
      .set("Authorization", `Bearer ${photographerToken}`);
    expect(getRes.body.data.viewerAccess.isPhotographer).toBe(false);
    expect(getRes.body.data.viewerAccess.isParticipant).toBe(false);
  });

  it("blocks the organizer from leaving their own event", async () => {
    const organizerToken = await registerAndLogin("leave-organizer3@test.com");
    const { event } = await createEvent(organizerToken);

    const res = await request(app)
      .post(`/api/events/${event._id}/leave`)
      .set("Authorization", `Bearer ${organizerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("ORGANIZER_CANNOT_LEAVE");
  });
});

describe("Delete event", () => {
  it("lets the organizer delete their own event", async () => {
    const organizerToken = await registerAndLogin("delete-organizer1@test.com");
    const { event } = await createEvent(organizerToken);

    const res = await request(app)
      .delete(`/api/events/${event._id}`)
      .set("Authorization", `Bearer ${organizerToken}`);
    expect(res.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/events/${event._id}`)
      .set("Authorization", `Bearer ${organizerToken}`);
    expect(getRes.status).toBe(404);
  });

  it("blocks a non-organizer from deleting an event", async () => {
    const organizerToken = await registerAndLogin("delete-organizer2@test.com");
    const strangerToken = await registerAndLogin("delete-stranger2@test.com");
    const { event } = await createEvent(organizerToken);

    const res = await request(app)
      .delete(`/api/events/${event._id}`)
      .set("Authorization", `Bearer ${strangerToken}`);
    expect(res.status).toBe(403);
  });
});

describe("Extend event duration", () => {
  it("auto-reactivates an EXPIRED event when the expiry date is pushed into the future", async () => {
    const organizerToken = await registerAndLogin("extend-organizer1@test.com");
    const { event } = await createEvent(organizerToken, {
      date: new Date(Date.now() - 5000).toISOString(),
      expiryDate: new Date(Date.now() + 1000).toISOString(),
    });

    // Force it into EXPIRED, simulating the sweep job having already run
    const { Event } = await import("../src/models/index.js");
    await Event.findByIdAndUpdate(event._id, { expiryDate: new Date(Date.now() - 1000), status: "EXPIRED" });

    const extendRes = await request(app)
      .put(`/api/events/${event._id}`)
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({ expiryDate: new Date(Date.now() + 5 * 86400000).toISOString() });

    expect(extendRes.status).toBe(200);
    expect(extendRes.body.data.event.status).toBe("ACTIVE");
  });

  it("rejects extending to a date before the event's own date", async () => {
    const organizerToken = await registerAndLogin("extend-organizer2@test.com");
    const { event } = await createEvent(organizerToken);

    const res = await request(app)
      .put(`/api/events/${event._id}`)
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({ expiryDate: new Date(Date.now() - 86400000).toISOString() });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_EXPIRY");
  });
});
