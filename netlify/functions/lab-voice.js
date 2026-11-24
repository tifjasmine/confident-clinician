/* Clinical Confidence Lab: spoken mock session (TESTING, preview account only).
   One round trip per turn: the trainee's recorded audio -> Deepgram speech-to-text -> the client's next line
   (same client prompt as the typed live session) -> Deepgram text-to-speech -> back to the page.
   Key: TESTING_DEEPGRAM (Netlify environment variable). AI key: ANTHROPIC_API_KEY.
   Voice model for speed: LAB_VOICE_MODEL (default Claude Haiku 5.5). Client voice: LAB_VOICE_DANA. */
const { verify } = require("../lib/lab-auth");
const { SCENARIOS, system, transcript } = require("./lab-live-session").shared;

const DG = () => process.env.TESTING_DEEPGRAM || "";
const MODEL = process.env.LAB_VOICE_MODEL || "claude-haiku-5-5";
const VOICES = { dana: process.env.LAB_VOICE_DANA || "aura-2-thalia-en" };
const MAX_TURNS = 12;
const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const clip = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);

async function stt(b64, mime) {
  const res = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true", {
    method: "POST", headers: { Authorization: `Token ${DG()}`, "Content-Type": mime || "audio/webm" }, body: Buffer.from(b64, "base64"),
  });
  if (!res.ok) { const e = new Error(`STT ${res.status}`); e.detail = (await res.text()).slice(0, 300); throw e; }
  const out = await res.json();
  return clip((((out.results || {}).channels || [])[0] || {}).alternatives?.[0]?.transcript, 1200);
}

async function tts(text, voice) {
  const go = model => fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=mp3`, {
    method: "POST", headers: { Authorization: `Token ${DG()}`, "Content-Type": "application/json" }, body: JSON.stringify({ text }),
  });
  let res = await go(voice);
  if (!res.ok) res = await go("aura-asteria-en");
  if (!res.ok) { const e = new Error(`TTS ${res.status}`); e.detail = (await res.text()).slice(0, 300); throw e; }
  return Buffer.from(await res.arrayBuffer()).toString("base64");
}

async function claude(sys, user) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 400, system: sys, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) { const e = new Error(`Anthropic ${res.status}`); e.detail = (await res.text()).slice(0, 300); throw e; }
  const out = await res.json();
  if (out.stop_reason === "refusal") return "SAFETY_PAUSE";
  return (out.content || []).filter(c => c.type === "text").map(c => c.text).join("").trim();
}

const spoken = t => clip(t, 700).replace(/^(Dana|Client)\s*:\s*/i, "").replace(/\*[^*]{0,40}\*\s*/g, "").replace(/\([^)]{0,40}\)\s*/g, "").replace(/^["“]|["”]$/g, "").trim();

exports.handler = async event => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  if (!DG()) return json(503, { error: "Voice isn’t set up yet (TESTING_DEEPGRAM is missing)." });
  if ((event.body || "").length > 4500000) return json(413, { error: "That recording was too long. Try a shorter answer." });
  const user = verify(event);
  if (!user) return json(401, { error: "Please sign in again.", auth: true });
  if (!user.test) return json(403, { error: "Voice sessions are still in testing." });
  let body; try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const key = body.scenario in SCENARIOS ? body.scenario : "dana", sc = SCENARIOS[key], voice = VOICES[key] || VOICES.dana;
  try {
    if (body.action === "open") return json(200, { ok: true, text: sc.opening, audio: await tts(sc.opening, voice) });
    if (body.action !== "turn" || !body.audio) return json(400, { error: "Missing audio" });
    const t0 = Date.now();
    const heard = await stt(body.audio, body.mime);
    if (!heard) return json(200, { ok: true, heard: "", retry: true });
    const hist = (Array.isArray(body.history) ? body.history : []).slice(-MAX_TURNS * 2);
    /* history -> the moments shape the typed session uses: each client line + the therapist's reply */
    const moments = [];
    hist.forEach(h => { if (h.who === "client") moments.push({ client: clip(h.text, 600), attempts: [] }); else if (moments.length) moments[moments.length - 1].attempts.push({ text: clip(h.text, 1200) }); });
    if (!moments.length) moments.push({ client: sc.opening, attempts: [] });
    moments[moments.length - 1].attempts.push({ text: heard });
    const sys = system("client", sc) + "\n\nTHIS IS A SPOKEN SESSION: the therapist's words were transcribed from speech, so ignore small transcription slips. Keep Dana's line short enough to say out loud: one to three sentences.";
    let text = await claude(sys, `SESSION SO FAR\n\n${transcript(sc, moments)}\n\nWrite Dana's next line, reacting to the therapist's latest attempt.`);
    if (/SAFETY_PAUSE/.test(text)) return json(200, { ok: true, heard, safety: true, text: "Let’s pause the role-play here. If a real client brings up safety, follow your assessment and safety protocol and consult your supervisor." });
    text = spoken(text) || "…Sorry, can you say that again?";
    const audio = await tts(text, voice);
    return json(200, { ok: true, heard, text, audio, ms: Date.now() - t0 });
  } catch (error) {
    console.error("Voice session failed", error.message, error.detail || "");
    return json(502, { error: "Dana didn’t come through that time. Try again.", status: error.message });
  }
};
