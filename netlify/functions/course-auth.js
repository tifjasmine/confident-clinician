const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, message: "Method not allowed." });
  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return json(500, { ok: false, message: "Member sign-in is not configured yet." });

  let payload = {};
  try { payload = JSON.parse(event.body || "{}"); } catch {}
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  if (!email || !password) return json(400, { ok: false, message: "Enter your email and password." });

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json();
    if (!response.ok || !result.access_token) return json(401, { ok: false, message: "That email and password do not match a member account." });
    return json(200, {
      ok: true,
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresIn: result.expires_in,
      email: result.user?.email || email,
    });
  } catch (error) {
    return json(500, { ok: false, message: "Sign-in is temporarily unavailable. Please try again." });
  }
};
