// "K7QX2PMH" -> "K7QX-2PMH" (display only; the backend accepts either form)
export const formatEventCode = (code) =>
  code && code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code || "";