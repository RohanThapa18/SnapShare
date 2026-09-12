/**
 * Masks an email for display in any listing that isn't the account
 * owner's own profile — e.g. an organizer viewing their participant or
 * photographer list. Keeps enough to recognize a familiar address
 * without exposing the full thing: "jordan.smith@gmail.com" -> "jo***@gmail.com"
 */
export const maskEmail = (email) => {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
};
