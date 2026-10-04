import { AppError } from "../utils/AppError.js";

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

const raw = process.env.AI_SERVICE_URL;
const baseUrl = /^https?:\/\//.test(raw) ? raw : `http://${raw}`;

export const detectFacesAndEmbed = async (imageBuffer) => {
  const form = new FormData();
  form.append("image", new Blob([imageBuffer]), "photo.jpg");

  return aiFetch("/detect-and-embed", { method: "POST", body: form });
};

/**
 * Sends 1-3 selfie buffers and combines them into a single query
 * embedding. Low-quality faces (too small, too blurry/angled per the AI
 * service's own detector confidence) are dropped before averaging, since
 * one bad selfie would otherwise drag the whole query vector off target.
 * Averaging + re-normalizing multiple good selfies produces a more
 * robust query than any single one — it smooths out lighting, expression,
 * and slight angle differences between shots.
 */
export const embedSelfies = async (selfieBuffers) => {
  const form = new FormData();
  selfieBuffers.forEach((buf, i) => form.append("image", new Blob([buf]), `selfie_${i}.jpg`));

  const { results } = await aiFetch("/embed-selfie", { method: "POST", body: form });

  const usable = results.filter((r) => r.embedding && !r.lowQuality);

  if (usable.length === 0) {
    const anyFaceAtAll = results.some((r) => r.embedding);
    throw new AppError(
      anyFaceAtAll
        ? "Selfie quality is too low to search reliably — try a closer, front-facing, well-lit photo."
        : "No face detected in the selfie. Please try a clearer photo.",
      422,
      "NO_USABLE_FACE"
    );
  }

  const dim = usable[0].embedding.length;
  const sum = new Array(dim).fill(0);
  usable.forEach((r) => r.embedding.forEach((v, i) => { sum[i] += v; }));
  const mean = sum.map((v) => v / usable.length);
  const norm = Math.sqrt(mean.reduce((s, v) => s + v * v, 0)) || 1;
  return mean.map((v) => v / norm);
};

export const cosineSimilarity = (a, b) => {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};