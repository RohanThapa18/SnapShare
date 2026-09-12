import { AppError } from "../utils/AppError.js";

/**
 * Thin HTTP client for the Python AI microservice. Talks over an
 * internal-only URL secured with a shared secret header — this service
 * should never be exposed directly to the internet.
 */
const aiFetch = async (path, options = {}) => {
  const baseUrl = process.env.AI_SERVICE_URL;
  if (!baseUrl) {
    throw new AppError(
      "AI_SERVICE_URL is not configured. Set it in .env to point at the running Python AI microservice.",
      500,
      "AI_SERVICE_NOT_CONFIGURED"
    );
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      "X-Internal-Secret": process.env.AI_SERVICE_SHARED_SECRET || "",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AppError(`AI service error (${res.status}): ${body}`, 502, "AI_SERVICE_ERROR");
  }

  return res.json();
};

/**
 * Sends a processed event-photo buffer to the AI service for face
 * detection + embedding generation. Returns an array of
 * { faceIndex, boundingBox, embedding } for every face found.
 */
export const detectFacesAndEmbed = async (imageBuffer) => {
  const form = new FormData();
  form.append("image", new Blob([imageBuffer]), "photo.jpg");

  return aiFetch("/detect-and-embed", { method: "POST", body: form });
};

/**
 * Sends a transient selfie buffer to generate a single query embedding.
 * The selfie itself is never persisted by the backend or the AI service —
 * only the resulting embedding vector is returned and used in-memory.
 */
export const embedSelfie = async (selfieBuffer) => {
  const form = new FormData();
  form.append("image", new Blob([selfieBuffer]), "selfie.jpg");

  const result = await aiFetch("/embed-selfie", { method: "POST", body: form });
  if (!result.embedding) {
    throw new AppError("No face detected in the selfie. Please try a clearer photo.", 422, "NO_FACE_DETECTED");
  }
  return result.embedding;
};

/**
 * Cosine similarity between two equal-length embedding vectors.
 * Used to compare a selfie embedding against stored event embeddings.
 */
export const cosineSimilarity = (a, b) => {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};
