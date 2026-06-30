// HTTP Basic Auth gate for the Coach Artie brain dashboard (brain.coachartiebot.com).
// Nothing internal calls this HTTP API (memory writes are DB-direct), so every request
// must authenticate. Creds come from env: BRAIN_AUTH_USER / BRAIN_AUTH_PASS.
export default defineEventHandler((event) => {
  const user = process.env.BRAIN_AUTH_USER;
  const pass = process.env.BRAIN_AUTH_PASS;
  // Fail closed: if creds are not configured, deny rather than expose the brain.
  if (!user || !pass) {
    setResponseHeader(event, "WWW-Authenticate", "Basic realm=\"Coach Artie Brain\"");
    throw createError({ statusCode: 401, statusMessage: "Auth not configured" });
  }
  const header = getRequestHeader(event, "authorization") || "";
  if (header.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const i = decoded.indexOf(":");
    if (i >= 0 && decoded.slice(0, i) === user && decoded.slice(i + 1) === pass) {
      return; // authorized
    }
  }
  setResponseHeader(event, "WWW-Authenticate", "Basic realm=\"Coach Artie Brain\"");
  throw createError({ statusCode: 401, statusMessage: "Authentication required" });
});
