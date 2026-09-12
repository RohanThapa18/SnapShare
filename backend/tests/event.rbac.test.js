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

describe("Event ownership (per-event, not global role)", () => {
  it("allows any authenticated user to create an event", async () => {
    const token = await registerAndLogin("anyuser@test.com");

    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Test Fest",
        date: new Date(Date.now() + 86400000).toISOString(),
        expiryDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.passcode).toMatch(/^[A-Z0-9]{6}$/);
    expect(res.body.data.event.passcodeHash).toBeUndefined(); // never leaked
    expect(res.body.data.event.photographerJoinToken).toBeDefined();
  });

  it("blocks event creation without authentication", async () => {
    const res = await request(app)
      .post("/api/events")
      .send({
        title: "Test Fest",
        date: new Date(Date.now() + 86400000).toISOString(),
        expiryDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      });

    expect(res.status).toBe(401);
  });

  it("rejects an event where expiryDate is before the event date", async () => {
    const token = await registerAndLogin("baddates@test.com");

    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Bad Dates",
        date: new Date(Date.now() + 2 * 86400000).toISOString(),
        expiryDate: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_EXPIRY");
  });

  it("only allows the organizer who created the event to edit it — even though both are the same 'type' of account", async () => {
    const ownerToken = await registerAndLogin("owner@test.com");
    const otherToken = await registerAndLogin("other@test.com");

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        title: "Owned Event",
        date: new Date(Date.now() + 86400000).toISOString(),
        expiryDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      });

    const eventId = createRes.body.data.event._id;

    const res = await request(app)
      .put(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Hijacked Title" });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("NOT_EVENT_OWNER");
  });

  it("the same account can organize one event and just be a participant in another", async () => {
    const userAToken = await registerAndLogin("usera@test.com");
    const userBToken = await registerAndLogin("userb@test.com");

    // User A organizes event 1
    const eventRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        title: "Event One",
        date: new Date(Date.now() + 86400000).toISOString(),
        expiryDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      });
    const event1Id = eventRes.body.data.event._id;
    const event1Passcode = eventRes.body.data.passcode;

    // User A ALSO joins User B's event as a plain participant
    const event2Res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${userBToken}`)
      .send({
        title: "Event Two",
        date: new Date(Date.now() + 86400000).toISOString(),
        expiryDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      });
    const event2Id = event2Res.body.data.event._id;
    const event2Passcode = event2Res.body.data.passcode;

    const joinRes = await request(app)
      .post(`/api/events/${event2Id}/join`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ passcode: event2Passcode });
    expect(joinRes.status).toBe(200);

    // User A cannot edit event 2 (not the organizer there) but CAN edit event 1
    const editOtherEvent = await request(app)
      .put(`/api/events/${event2Id}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ title: "Nope" });
    expect(editOtherEvent.status).toBe(403);

    const editOwnEvent = await request(app)
      .put(`/api/events/${event1Id}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ title: "Updated Title" });
    expect(editOwnEvent.status).toBe(200);
  });
});
