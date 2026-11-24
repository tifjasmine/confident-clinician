/* Clinical Confidence Lab: spoken mock session (TESTING, preview account only).
   One round trip per turn: the trainee's recorded audio -> Deepgram speech-to-text -> the client's next line
   (same client prompt as the typed live session) -> Deepgram text-to-speech -> back to the page.
   Key: TESTING_DEEPGRAM (Netlify environment variable). AI key: ANTHROPIC_API_KEY.
   Voice model for speed: LAB_VOICE_MODEL (default Claude Haiku 5.5). Client voice: LAB_VOICE_DANA. */
const { verify } = require("../lib/lab-auth");
const { SCENARIOS, system, transcript } = require("./lab-live-session").shared;
const GUIDED = require("../lib/voice-guided");

const DG = () => process.env.TESTING_DEEPGRAM || "";
const MODEL = process.env.LAB_AI_MODEL || "claude-sonnet-5-5";
const FAST = process.env.LAB_VOICE_MODEL || "claude-haiku-5-5";
const VOICES = { dana: process.env.LAB_VOICE_DANA || "aura-2-thalia-en" };
/* Voices the preview account can audition (Deepgram Aura-2, English) */
const PICK = ["aura-2-thalia-en", "aura-2-andromeda-en", "aura-2-helena-en", "aura-2-luna-en", "aura-2-cora-en", "aura-2-delia-en", "aura-2-asteria-en", "aura-2-athena-en"];
/* Dana's hidden map (DRAFT for Tiffany's clinical review). She only goes deeper when the therapist earns it. */
const MAPS = { dana: `DANA'S HIDDEN MAP (for you only; never name the layers)
LAYER 1, SURFACE (where she starts): tired, didn't do the thought record, expects to be "grilled" about it. Short answers, a little flat, testing whether this session will be another lecture.
LAYER 2, MIDDLE (opens when the therapist gets curious instead of correcting, uses her words, or asks about her experience rather than the homework): she feels managed by everyone. Checklists and protocols at work, her manager's "just follow the steps," her mom's articles about sleep and self-care. Everyone hands her a fix; nobody asks how she's doing. Some dry humor shows up here.
LAYER 3, CORE (opens only after the therapist has stayed with layer 2 for a bit, slowly, without fixing): she's scared that if she slips at work, a patient gets hurt, and it would prove what she's always felt from her mom, that she's never quite enough. The homework felt like one more test she could fail. She may get quiet or a little teary here (show it in words like "...yeah" or "I don't know why I'm telling you this").
MOVING BETWEEN LAYERS:
- Curiosity, her own words, slowing down, one question at a time: she goes one layer deeper, gradually, never jumping from 1 to 3 in one reply.
- Interpreting too fast or naming her feelings for her ("you're avoiding your feelings"), lecturing, fixing, re-assigning homework, or stacking questions: she gets a bit defensive and pulls back up a layer for a turn or two.
- Reassurance that skips what she said: polite, flat, stays where she is.
- Once a layer is open, she doesn't fully close it again unless the therapist pushes hard.
Stay consistent with what she's already said earlier in the session.` };
const GOALS = { dana: "SESSION GOAL for the trainee: find out what really got in the way of the homework, without assigning anything new. STRETCH: Dana shares what she's afraid would happen if she slipped at work." };
const SUMMARY_MODEL = process.env.LAB_AI_MODEL || "claude-sonnet-5-5";
/* What the course teaches, so the client and the feedback use the course's language */
const COURSE = `COURSE CONTENT (The Confident Clinician's Clinical Confidence Lab, Week 1: Notice)
- Lesson 1, the four gaps behind a freeze: Knowledge (something you don't know yet), Skill (you know it but can't do it live yet), Pressure (you could do it, but the moment got in the way), Support (the situation needs consultation, supervision, or a referral). "Just be more confident" is never the plan.
- Lesson 2, Pulls under pressure: Rescue (make the hard feeling stop), Fix (solve it fast), Fill (fill silence, keep it comfortable), Defend (justify or explain yourself), Prove (show you're competent). Pressure shows up in the body, in thoughts, and in what you do (too many questions, explaining too soon, reassuring, changing the topic, talking fast). The test: could the client disagree with you without taking care of your feelings? Resets: plant your feet, slow your pace, one breath, go back to their exact words. Not every urge is a Pull: a direct safety question is a clinical call.
- Lesson 3, P.A.U.S.E.: Pause (don't let the urge choose), Attend (their words, emotion, body, the relationship, anything urgent), Use what the client gave you (their exact words), Say one intentional thing (one reflection, question, observation, or check-in, not three in a row), Explore before explaining. If safety comes up, assessment and protocol come first.
- The Three Checks for any response: What were they really asking for? Did I use their words? Which Pull showed up?
- Later weeks: choosing a focus when there's more than one direction; giving a session purpose without getting rigid; reviewing sessions, repairing ruptures, and building confidence from evidence.`;
const MAX_TURNS = 12;
/* Words the trainee is likely to say in session, so speech-to-text spells them right */
const KEYTERMS = ["Dana", "homework", "thought record", "worksheet", "the sheet", "ER", "shifts", "burnout", "anxiety", "session"].map(k => "keyterm=" + encodeURIComponent(k)).join("&");
const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const clip = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);

async function stt(b64, mime) {
  const res = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&language=en&smart_format=true&punctuate=true&" + KEYTERMS, {
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

async function claude(sys, user, model, maxTokens) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    /* the long instructions are cached between turns: faster and cheaper */
    body: JSON.stringify({ model: model || MODEL, max_tokens: maxTokens || 400, system: [{ type: "text", text: sys, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) { const e = new Error(`Anthropic ${res.status}`); e.detail = (await res.text()).slice(0, 300); throw e; }
  const out = await res.json();
  if (out.stop_reason === "refusal") return "SAFETY_PAUSE";
  return (out.content || []).filter(c => c.type === "text").map(c => c.text).join("").trim();
}

/* history -> the moments shape the typed session uses: each client line + the therapist's reply */
function toMoments(sc, history) {
  const moments = [];
  (Array.isArray(history) ? history : []).slice(-MAX_TURNS * 2).forEach(h => { if (h.who === "client") moments.push({ client: clip(h.text, 600), attempts: [] }); else if (moments.length) moments[moments.length - 1].attempts.push({ text: clip(h.text, 1200) }); });
  if (!moments.length) moments.push({ client: sc.opening, attempts: [] });
  return moments;
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
  const key = body.scenario in SCENARIOS ? body.scenario : "dana", sc = SCENARIOS[key], voice = PICK.includes(body.voice) ? body.voice : (VOICES[key] || VOICES.dana);
  try {
    if (body.action === "open") {
      const [audio, f1, f2] = await Promise.all([tts(sc.opening, voice), tts("Mm.", voice), tts("Hmm...", voice)]);
      return json(200, { ok: true, text: sc.opening, audio, fillers: [f1, f2] });
    }
    /* ---- Guided session ---- */
    const G = GUIDED[key];
    if (G && body.action === "gstart") {
      const m = G.moments[0];
      const [line, o, g, p, f1, f2] = await Promise.all([tts(m.line, voice), tts(m.replies.open, voice), tts(m.replies.guarded, voice), tts(m.replies.pull, voice), tts("Mm.", voice), tts("Hmm...", voice)]);
      const script = { client: G.client, intro: G.intro, goal: G.goal, stretch: G.stretch, moments: G.moments.map(x => ({ skill: x.skill, focus: x.focus, line: x.line, replies: x.replies })), closings: G.closings };
      return json(200, { ok: true, script, audio: { line, open: o, guarded: g, pull: p }, fillers: [f1, f2] });
    }
    if (G && body.action === "gprep") {
      const i = Math.max(0, Math.min(G.moments.length - 1, +body.i || 0)), m = G.moments[i];
      const [line, o, g, p] = await Promise.all([tts(m.line, voice), tts(m.replies.open, voice), tts(m.replies.guarded, voice), tts(m.replies.pull, voice)]);
      const out = { line, open: o, guarded: g, pull: p };
      if (i === G.moments.length - 1) { const [w, f] = await Promise.all([tts(G.closings.warm, voice), tts(G.closings.flat, voice)]); out.warm = w; out.flat = f; }
      return json(200, { ok: true, i, audio: out });
    }
    if (G && body.action === "gturn") {
      const i = Math.max(0, Math.min(G.moments.length - 1, +body.i || 0)), m = G.moments[i];
      const t0 = Date.now(), heard = await stt(body.audio, body.mime);
      if (!heard) return json(200, { ok: true, heard: "", retry: true });
      const t1 = Date.now();
      const sys = `You sort a therapist-in-training's spoken response in a practice session. Everyone is fictional. Their words were transcribed from speech, so ignore small slips.
${COURSE}
Client: ${G.client}. Reply with ONE word only:
- open: the response ${m.open}.
- pull: the response ${m.pull}.
- guarded: anything else (neutral, vague, off-topic, or a mix).
When it's a reasonable, caring attempt that partly does the "open" move, choose open.`;
      const raw = (await claude(sys, `${G.client} said: "${m.line}"\nTherapist said: "${heard}"\nOne word: open, guarded, or pull.`, FAST, 10)).toLowerCase();
      const pick = /open/.test(raw) ? "open" : /pull/.test(raw) ? "pull" : "guarded";
      return json(200, { ok: true, heard, pick, parts: { listen: t1 - t0, think: Date.now() - t1, voice: 0 }, ms: Date.now() - t0 });
    }
    if (body.action === "wrap") {
      const moments = toMoments(sc, body.history);
      if (!moments.some(m => m.attempts.length)) return json(400, { error: "Nothing to review yet" });
      const sys = `You give feedback on a spoken practice session inside The Confident Clinician's Clinical Confidence Lab. Everyone is fictional. The therapist's words were transcribed from speech, so ignore small transcription slips.
CLIENT BACKGROUND (fictional)\n${sc.background}\n\nSETUP\n${sc.setup}\n\n${MAPS[key] || ""}\n\n${GOALS[key] || ""}\n\n${COURSE}
Voice: warm, direct, practical, like an experienced clinician. Talk to the trainee as "you". Quote their actual words. Use the course's language (gaps, Pulls, resets, P.A.U.S.E., the Three Checks) where it genuinely fits. No grades, no scores, no "correct/wrong", no "great job". Don't write lines for them to say.
Return ONLY a JSON object:
{"arc": "one or two sentences: how deep Dana got (surface, middle, or core, described in plain words like 'she started opening up about feeling managed by everyone', never the word 'layer'), and the therapist's move right before it shifted most, or what pulled her back up",
 "well": ["2 or 3 specific things that worked, each one sentence, quoting their words"],
 "build": ["1 or 2 specific next steps, each one sentence, framed forward (Next time..., To deepen this...), tied to a moment in the session"],
 "noticed": ["1 or 2 patterns you noticed across the session, like pace, question stacking, using her words, a Pull that kept showing up, or how they handled silence"],
 "goal": "one or two sentences: how close they got to the session goal (and the stretch, if they got there), naming the move that got them closer or what got in the way. No grade or yes/no verdict.",
 "next": "the one course skill to practice next, and in one sentence why"}`;
      const gnote = G && Array.isArray(body.picks) && body.picks.length ? `\n\nThis was a GUIDED session. Each moment practiced one course skill, and Dana's reply showed how it landed (open = she opened up, guarded = she stayed where she was, pull = she pulled back):\n${body.picks.map((p, k) => `Moment ${k + 1} (${(G.moments[k] || {}).skill}): ${p}`).join("\n")}\nUse this. Say which skills landed and which to practice.` : "";
      const text = await claude(sys + gnote, `FULL SESSION\n\n${transcript(sc, moments)}`, SUMMARY_MODEL, 1500);
      let parts = null; const m = text.match(/\{[\s\S]*\}/);
      try { parts = m ? JSON.parse(m[0]) : null; } catch { parts = null; }
      if (!parts) return json(502, { error: "The breakdown didn’t come through. Try again." });
      const arr = v => (Array.isArray(v) ? v : [v]).filter(Boolean).map(x => clip(x, 400)).slice(0, 3);
      return json(200, { ok: true, summary: { goal: clip(parts.goal, 500), arc: clip(parts.arc, 500), well: arr(parts.well), build: arr(parts.build), noticed: arr(parts.noticed), next: clip(parts.next, 400) } });
    }
    if (body.action !== "turn" || !body.audio) return json(400, { error: "Missing audio" });
    const t0 = Date.now();
    const heard = await stt(body.audio, body.mime);
    const t1 = Date.now(), model = body.speed === "smart" ? MODEL : FAST;
    if (!heard) return json(200, { ok: true, heard: "", retry: true });
    const moments = toMoments(sc, body.history);
    moments[moments.length - 1].attempts.push({ text: heard });
    const sys = system("client", sc) + "\n\n" + (MAPS[key] || "") + "\n\nTHIS IS A SPOKEN SESSION: the therapist's words were transcribed from speech, so ignore small transcription slips. Keep Dana's line short enough to say out loud: one to three sentences.\n\nThe trainee is taking this course; use it only to recognize their moves (Pulls, using her words, stacking questions, rushing) and react the way a real person would. Dana never names or mentions any of it.\n" + COURSE;
    const ask = `SESSION SO FAR\n\n${transcript(sc, moments)}\n\nWrite Dana's next line, reacting to the therapist's latest attempt. Reply with Dana's spoken words only.`;
    let text = await claude(sys, ask, model, 600);
    if (!spoken(text) && !/SAFETY_PAUSE/.test(text)) { console.error("Voice: empty client reply, retrying", JSON.stringify(text).slice(0, 200)); text = await claude(sys, ask + "\n\nWrite one or two plain spoken sentences from Dana now.", model, 600); }
    if (/SAFETY_PAUSE/.test(text)) return json(200, { ok: true, heard, safety: true, text: "Let’s pause the role-play here. If a real client brings up safety, follow your assessment and safety protocol and consult your supervisor." });
    text = spoken(text);
    if (!text) { console.error("Voice: empty client reply after retry"); return json(502, { error: "Dana didn’t come through that time. Say it again." }); }
    const t2 = Date.now(), audio = await tts(text, voice), t3 = Date.now();
    return json(200, { ok: true, heard, text, audio, ms: t3 - t0, parts: { listen: t1 - t0, think: t2 - t1, voice: t3 - t2 } });
  } catch (error) {
    console.error("Voice session failed", error.message, error.detail || "");
    return json(502, { error: "Dana didn’t come through that time. Try again.", status: error.message });
  }
};
