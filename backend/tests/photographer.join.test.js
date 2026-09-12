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

const createEvent = async (organizerToken) => {
  const res = await request(app)
    .post("/api/events")
    .set("Authorization", `Bearer ${organizerToken}`)
    .send({
      title: "Photographer Join Test Event",
      date: new Date(Date.now() + 86400000).toISOString(),
      expiryDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    });
  return res.body.data.event;
};

describe("Photographer self-join via separate token", () => {
  it("uses a photographerJoinToken that is different from the participant joinToken", async () => {
    const organizerToken = await registerAndLogin("photog-organizer1@test.com");
    const event = await createEvent(organizerToken);

    expect(event.photographerJoinToken).toBeDefined();
    expect(event.photographerJoinToken).not.toBe(event.joinToken);
  });

  it("lets a user self-join as a photographer with the correct token", async () => {
    const organizerToken = await registerAndLogin("photog-organizer2@test.com");
    const photographerToken = await registerAndLogin("photog-user2@test.com");
    const event = await createEvent(organizerToken);

    const res = await request(app)
      .post(`/api/events/${event._id}/join-as-photographer`)
      .set("Authorization", `Bearer ${photographerToken}`)
      .send({ photographerToken: event.photographerJoinToken });

    expect(res.status).toBe(200);
  });

  it("rejects an incorrect photographer token", async () => {
    const organizerToken = await registerAndLogin("photog-organizer3@test.com");
    const photographerToken = await registerAndLogin("photog-user3@test.com");
    const event = await createEvent(organizerToken);

    const res = await request(app)
      .post(`/api/events/${event._id}/join-as-photographer`)
      .set("Authorization", `Bearer ${photographerToken}`)
      .send({ photographerToken: "wrong-token-value-here" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_PHOTOGRAPHER_TOKEN");
  });

  it("rejects using the PARTICIPANT joinToken on the photographer-join endpoint", async () => {
    const organizerToken = await registerAndLogin("photog-organizer4@test.com");
    const photographerToken = await registerAndLogin("photog-user4@test.com");
    const event = await createEvent(organizerToken);

    const res = await request(app)
      .post(`/api/events/${event._id}/join-as-photographer`)
      .set("Authorization", `Bearer ${photographerToken}`)
      .send({ photographerToken: event.joinToken }); // wrong token type on purpose

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_PHOTOGRAPHER_TOKEN");
  });

  it("grants both photographer AND participant access after self-joining as photographer", async () => {
    const organizerToken = await registerAndLogin("photog-organizer5@test.com");
    const photographerUserToken = await registerAndLogin("photog-user5@test.com");
    const event = await createEvent(organizerToken);

    await request(app)
      .post(`/api/events/${event._id}/join-as-photographer`)
      .set("Authorization", `Bearer ${photographerUserToken}`)
      .send({ photographerToken: event.photographerJoinToken });

    const getRes = await request(app)
      .get(`/api/events/${event._id}`)
      .set("Authorization", `Bearer ${photographerUserToken}`);

    expect(getRes.body.data.viewerAccess.isPhotographer).toBe(true);
    expect(getRes.body.data.viewerAccess.isParticipant).toBe(true);
    expect(getRes.body.data.viewerAccess.isOrganizer).toBe(false);
  });

  it("organizer can still add a photographer directly by email, without any token", async () => {
    const organizerToken = await registerAndLogin("photog-organizer6@test.com");
    await registerAndLogin("photog-invitee6@test.com"); // just needs to have an account
    const event = await createEvent(organizerToken);

    const res = await request(app)
      .post(`/api/events/${event._id}/photographers`)
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({ email: "photog-invitee6@test.com" });

    expect(res.status).toBe(201);
  });

  it("blocks a non-organizer from adding photographers by email", async () => {
    const organizerToken = await registerAndLogin("photog-organizer7@test.com");
    const strangerToken = await registerAndLogin("photog-stranger7@test.com");
    await registerAndLogin("photog-invitee7@test.com");
    const event = await createEvent(organizerToken);

    const res = await request(app)
      .post(`/api/events/${event._id}/photographers`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .send({ email: "photog-invitee7@test.com" });

    expect(res.status).toBe(403);
  });
});
