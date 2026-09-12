import { describe, it, expect } from "vitest";
import "./setup.js";

process.env.JWT_SECRET = "test-secret-key-for-vitest-only";
process.env.NODE_ENV = "test";

// These tests exercise the model layer directly to verify the schema-level
// privacy guarantees, since full Find My Photos integration requires a
// live AI service. Route-level membership enforcement is covered by
// requireEventParticipant in tests/event.join.test.js's join flow.

describe("FaceEmbedding privacy guarantees", () => {
  it("never includes the embedding field by default in queries", async () => {
    const { FaceEmbedding } = await import("../src/models/index.js");
    const { Types } = await import("mongoose");

    const doc = await FaceEmbedding.create({
      eventId: new Types.ObjectId(),
      photoId: new Types.ObjectId(),
      faceIndex: 0,
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
      embedding: [0.1, 0.2, 0.3],
    });

    const fetched = await FaceEmbedding.findById(doc._id);
    expect(fetched.embedding).toBeUndefined();
  });

  it("strips embedding from toJSON output even if explicitly selected", async () => {
    const { FaceEmbedding } = await import("../src/models/index.js");
    const { Types } = await import("mongoose");

    const doc = await FaceEmbedding.create({
      eventId: new Types.ObjectId(),
      photoId: new Types.ObjectId(),
      faceIndex: 0,
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
      embedding: [0.1, 0.2, 0.3],
    });

    const fetched = await FaceEmbedding.findById(doc._id).select("+embedding");
    const json = fetched.toJSON();
    expect(json.embedding).toBeUndefined();
  });

  it("only returns embeddings scoped to the queried eventId", async () => {
    const { FaceEmbedding } = await import("../src/models/index.js");
    const { Types } = await import("mongoose");

    const eventA = new Types.ObjectId();
    const eventB = new Types.ObjectId();

    await FaceEmbedding.create({
      eventId: eventA,
      photoId: new Types.ObjectId(),
      faceIndex: 0,
      boundingBox: { x: 0, y: 0, width: 10, height: 10 },
      embedding: [1, 0, 0],
    });
    await FaceEmbedding.create({
      eventId: eventB,
      photoId: new Types.ObjectId(),
      faceIndex: 0,
      boundingBox: { x: 0, y: 0, width: 10, height: 10 },
      embedding: [0, 1, 0],
    });

    const resultsForA = await FaceEmbedding.find({ eventId: eventA });
    expect(resultsForA).toHaveLength(1);
    expect(resultsForA[0].eventId.toString()).toBe(eventA.toString());
  });
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", async () => {
    const { cosineSimilarity } = await import("../src/services/aiService.js");
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", async () => {
    const { cosineSimilarity } = await import("../src/services/aiService.js");
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});
