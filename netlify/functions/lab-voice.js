/* Clinical Confidence Lab: spoken mock session (TESTING, preview account only).
   One round trip per turn: the trainee's recorded audio -> Deepgram speech-to-text -> the client's next line
   (same client prompt as the typed live session) -> Deepgram text-to-speech -> back to the page.
   Key: TESTING_DEEPGRAM (Netlify environment variable). AI key: ANTHROPIC_API_KEY.
   Voice model for speed: LAB_VOICE_MODEL (default Claude Haiku 5.5). Client voice: LAB_VOICE_DANA. */
const { verify, useLive } = require("../lib/lab-auth");
const { SCENARIOS, system, transcript } = require("./lab-live-session").shared;
const GUIDED = require("../lib/voice-guided");

const DG = () => process.env.TESTING_DEEPGRAM || "";
const MODEL = process.env.LAB_AI_MODEL || "claude-sonnet-5-5";
const FAST = process.env.LAB_VOICE_MODEL || "claude-haiku-5-5";
const VOICES = { dana: process.env.LAB_VOICE_DANA || "aura-2-delia-en" };
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
const KEYTERMS = ["Dana", "homework", "thought record", "worksheet", "the sheet", "ER", "shifts", "burnout", "anxiety", "session", "checklist", "protocols", "articles", "manager"].map(k => "keyterm=" + encodeURIComponent(k)).join("&");
const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const clip = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);

async function stt(b64, mime) {
  const buf = Buffer.from(b64, "base64");
  if (buf.length < 1200) return ""; /* nothing was recorded */
  const go = type => fetch("https://api.deepgram.com/v1/listen?model=nova-3&language=en&smart_format=true&punctuate=true&" + KEYTERMS, {
    method: "POST", headers: { Authorization: `Token ${DG()}`, "Content-Type": type }, body: buf,
  });
  let res = await go(mime || "audio/webm");
  /* iPhone recordings are sometimes labeled oddly: let Deepgram work out the format itself */
  if (res.status === 400) res = await go("audio/*");
  if (!res.ok) { const e = new Error(`STT ${res.status}`); e.detail = (await res.text()).slice(0, 300); throw e; }
  const out = await res.json();
  return clip((((out.results || {}).channels || [])[0] || {}).alternatives?.[0]?.transcript, 1200);
}

async function tts(text, voice) {
  const go = model => fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=mp3`, {
    method: "POST", headers: { Authorization: `Token ${DG()}`, "Content-Type": "application/json" }, body: JSON.stringify({ text }),
  });
  /* keep Dana's voice the same all session: retry the same voice instead of switching to a different one */
  let res = await go(voice);
  for (let n = 0; n < 2 && !res.ok; n++) { await new Promise(r => setTimeout(r, 400 * (n + 1))); res = await go(voice); }
  if (!res.ok) { const e = new Error(`TTS ${res.status}`); e.detail = (await res.text()).slice(0, 300); throw e; }
  return Buffer.from(await res.arrayBuffer()).toString("base64");
}

async function claude(sys, user, model, maxTokens) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    /* the long instructions are cached between turns: faster and cheaper */
    /* same settings as the typed live session: minimal thinking, so the word budget goes to the reply */
    body: JSON.stringify(Object.assign({ model: model || MODEL, max_tokens: Math.max(1500, maxTokens || 0), system: [{ type: "text", text: sys, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: user }] },
      /sonnet|opus/.test(model || MODEL) ? { thinking: { type: "between_tools" }, output_config: { effort: "low" } } : {})),
  });
  if (!res.ok) { const e = new Error(`Anthropic ${res.status}`); e.detail = (await res.text()).slice(0, 300); throw e; }
  const out = await res.json();
  if (out.stop_reason === "refusal") return "SAFETY_PAUSE";
  return (out.content || []).filter(c => c.type === "text").map(c => c.text).join("").trim();
}

/* ---- Airtable: one row per voice session, upserted by Session ID ---- */
const AT_BASE = process.env.AIRTABLE_LAB_BASE_ID || "appO3gcHI0Qc3e0OC";
const AT_VOICE = process.env.AIRTABLE_LAB_VOICE_TABLE_ID || "tblPju0hLIU30m5Ro";
async function logSession(user, b, G) {
  const tok = process.env.AIRTABLE_LAB_TOKEN || process.env.AIRTABLE_ACCESS_TOKEN; if (!tok) return;
  const atts = (Array.isArray(b.attempts) ? b.attempts : []).slice(0, 60);
  const picks = (Array.isArray(b.picks) ? b.picks : []).slice(0, 10);
  const word = { open: "opened up", guarded: "stayed guarded", pull: "pulled back" };
  const fields = {
    "Session ID": clip(b.sessionId, 60), "Email": user.email, "Client": G ? G.client : "Dana",
    "Status": ["In progress", "Completed", "Ended early"].includes(b.status) ? b.status : "In progress",
    "Moments done": picks.filter(Boolean).length, "Opened up": picks.filter(p => p === "open").length,
    "Retries": Math.max(0, atts.length - picks.filter(Boolean).length),
    "Reached stretch goal": G ? picks[G.moments.length - 1] === "open" : false,
    "How each moment landed": picks.map((p, k) => `${k + 1}. ${G && G.moments[k] ? G.moments[k].skill : ""}: Dana ${word[p] || "-"}`).join("\n"),
    "Transcript": clip((Array.isArray(b.history) ? b.history : []).map(h => `${h.who === "client" ? "Dana" : "Trainee"}: ${h.text}`).join("\n"), 90000).replace(/ (Dana|Trainee): /g, "\n$1: "),
    "All attempts": atts.map(a => `Moment ${a.moment} · ${a.skill}\nSaid: ${a.said}\nDana ${word[a.land] || ""}: ${a.reply}${a.note ? `\nNote: ${a.note}` : ""}`).join("\n\n").slice(0, 90000),
    "Test account": !!user.test
  };
  if (b.started) fields.Started = b.started;
  if (b.breakdown) fields.Breakdown = clip(b.breakdown, 20000);
  if (b.avgWait) fields["Avg wait (sec)"] = Math.round(b.avgWait * 10) / 10;
  const res = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${AT_VOICE}`, { method: "PATCH", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
    body: JSON.stringify({ performUpsert: { fieldsToMergeOn: ["Session ID"] }, typecast: true, records: [{ fields }] }) });
  if (!res.ok) console.error("Voice log failed", res.status, (await res.text()).slice(0, 200));
}
/* Attach one recording to the session's row (Recordings field) */
const AT_REC_FIELD = process.env.AIRTABLE_LAB_VOICE_REC_FIELD || "fldwd70bPUu8y3ojZ";
async function saveClip(user, b) {
  const tok = process.env.AIRTABLE_LAB_TOKEN || process.env.AIRTABLE_ACCESS_TOKEN; if (!tok) return;
  const up = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${AT_VOICE}`, { method: "PATCH", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
    body: JSON.stringify({ performUpsert: { fieldsToMergeOn: ["Session ID"] }, typecast: true, records: [{ fields: { "Session ID": clip(b.sessionId, 60), "Email": user.email } }] }) });
  if (!up.ok) { console.error("Voice clip row failed", up.status); return; }
  const rec = ((await up.json()).records || [])[0]; if (!rec) return;
  const res = await fetch(`https://content.airtable.com/v0/${AT_BASE}/${rec.id}/${AT_REC_FIELD}/uploadAttachment`, { method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: clip(b.mime || "audio/webm", 60), filename: clip(b.name || "answer.webm", 80).replace(/[^\w.-]/g, "_"), file: b.audio }) });
  if (!res.ok) console.error("Voice clip upload failed", res.status, (await res.text()).slice(0, 200));
}
/* TTS for one guided moment: the line + every reply (+ closings on the last moment) */
async function prepMoment(G, i, voice) {
  const m = G.moments[i], jobs = [["line", m.line]];
  if (i === G.moments.length - 1) jobs.push(["warm", G.closings.warm], ["flat", G.closings.flat]);
  const done = await Promise.all(jobs.map(([, t]) => tts(t, voice)));
  return Object.fromEntries(jobs.map(([k], n) => [k, done[n]]));
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
  let body; try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  /* The open conversation is still a test feature; the guided session (Week 1, step 8) is open to students, with daily limits. */
  if (!user.test && ["open", "turn"].includes(body.action)) return json(403, { error: "That’s still in testing." });
  if (["gstart", "gturn"].includes(body.action)) {
    try { const u = await useLive(user, body.sessionId); if (!u.ok) return json(429, { error: u.message, limit: true }); }
    catch (e) { console.error("Voice usage check failed (allowing)", e.message); }
  }
  const key = body.scenario in SCENARIOS ? body.scenario : "dana", sc = SCENARIOS[key], voice = PICK.includes(body.voice) ? body.voice : (VOICES[key] || VOICES.dana);
  try {
    /* Demo "Your turn": turn the student's spoken answer into text for their box. Nothing is stored. */
    if (body.action === "transcribe") {
      if (!body.audio) return json(400, { error: "Missing audio" });
      return json(200, { ok: true, text: await stt(body.audio, body.mime) });
    }
    /* Demo "Your turn": Jordan answers the student's line, in writing. */
    if (body.action === "jordan") {
      const said = clip(body.text, 600);
      if (said.length < 2) return json(400, { error: "Missing answer" });
      const sys = `You are playing Jordan, a fictional therapy client, for a training exercise for new therapists. Jordan is 29, in session 3, and has been talking about a four-year relationship and how exhausting the fights have been. Jordan is tired, ambivalent, and wants someone else to make the call.
Jordan just said: "Just tell me what to do. You're the therapist. Should I break up with them?"
The therapist answers. Write Jordan's next line only.
- Stay in character. React honestly to what the therapist actually said: if they give advice or a verdict, Jordan leans on it or pushes back; if they hand the decision back flatly, Jordan gets a little frustrated; if they get curious or name what's underneath, Jordan opens up a bit more.
- One to three short spoken sentences, plain everyday words, like real speech. No stage directions, no quotation marks, no name label.
- Never coach or grade the therapist, never mention training, and never break character.
- Nothing about self-harm or harm to others unless the therapist raised it; if they did, answer calmly and say Jordan is safe.`;
      const reply = String(await claude(sys, `The therapist said: ${said}`, FAST, 300) || "").replace(/^(Jordan|Client)\s*:\s*/i, "").replace(/^["“]|["”]$/g, "").trim();
      if (!reply || reply === "SAFETY_PAUSE") return json(200, { ok: false, error: "Jordan couldn’t answer that one. Try saying it another way." });
      return json(200, { ok: true, reply: clip(reply, 400) });
    }
    if (body.action === "open") {
      const [audio, f1, f2] = await Promise.all([tts(sc.opening, voice), tts("Mm.", voice), tts("Hmm...", voice)]);
      return json(200, { ok: true, text: sc.opening, audio, fillers: [f1, f2] });
    }
    /* ---- Guided session ---- */
    const G = GUIDED[key];
    if (G && body.action === "gstart") {
      const audio = await prepMoment(G, 0, voice);
      const script = { client: G.client, intro: G.intro, goal: G.goal, stretch: G.stretch, moments: G.moments.map(x => ({ skill: x.skill, focus: x.focus, hint: x.hint, line: x.line, replies: Object.fromEntries(x.replies.map(r => [r.key, { text: r.text, land: r.land }])) })), closings: G.closings };
      return json(200, { ok: true, script, audio });
    }
    if (G && body.action === "gprep") {
      const i = Math.max(0, Math.min(G.moments.length - 1, +body.i || 0));
      return json(200, { ok: true, i, audio: await prepMoment(G, i, voice) });
    }
    if (G && body.action === "gturn") {
      const i = Math.max(0, Math.min(G.moments.length - 1, +body.i || 0)), m = G.moments[i];
      const t0 = Date.now(), typed = clip(body.text, 1200), heard = typed || (body.audio ? await stt(body.audio, body.mime) : "");
      if (!heard) return json(200, { ok: true, heard: "", retry: true });
      const t1 = Date.now();
      const next = G.moments[i + 1];
      const sys = `You play ${G.client} in a GUIDED spoken practice session for therapists-in-training. Everyone is fictional. The therapist's words were transcribed from speech, so ignore small slips.
CLIENT BACKGROUND (fictional)\n${sc.background}\n\n${MAPS[key] || ""}\n\n${COURSE}${typed ? "\nThis time the therapist typed their response instead of speaking it." : ""}
Return ONLY a JSON object: {"land": "open" | "guarded" | "pull", "reply": "...", "note": "..."}
1. "land": how the therapist's response lands, using the GUIDE for this moment. Reasonable, caring attempts that partly do an "open" move count as open.
2. "reply": ${G.client}'s spoken reply. FIRST respond directly to what the therapist actually said or asked (if they asked a question, answer it, even briefly or reluctantly). Then let it carry the feeling and gist of the GUIDE example for that landing. Use the GUIDE examples as direction, not a script.
3. "note": a training note for the trainee, ONE sentence, max 25 words, about THIS moment's skill (${m.skill}). If it landed open, name specifically what they did that worked, quoting a few of their words. If guarded or pull, name what happened (a Pull, skipping her words, a question stack, reassurance, advice) and point to one direction to try. Warm and plain. Never give them a line to say, never quote suggested wording, no "try saying".
MAKE SENSE, ALWAYS: the reply must be a natural, logical answer to the therapist's exact words. Read the therapist's words carefully: if they said they will NOT do something (no worksheet, no homework), Dana reacts to that (relief, surprise, doubt), never as if they did it. Before answering, check: would a real person say this right after hearing exactly that? If not, rewrite it.
The note must accurately describe what the therapist actually said, in plain words a new therapist uses every day. No grammar or technical terms (never "conditional", "clause", "modal"). If the response was reasonable, say so plainly; don't invent a problem.
Rules for the reply: one or two short sentences, everyday spoken words, no stage directions, no quotes, no therapy-speak. Never mention the course or skills. Don't jump ahead to what she'll say next${next ? ` (her next line will be: "${next.line}")` : ""}, and don't reveal more than this landing allows.`;
      const guide = m.replies.map(r => `- ${r.land.toUpperCase()} when the therapist ${r.when}. Example gist: "${r.text}"`).join("\n");
      const hist = (Array.isArray(body.history) ? body.history : []).slice(-12).map(h => `${h.who === "client" ? G.client : "Therapist"}: ${clip(h.text, 400)}`).join("\n");
      const raw = await claude(sys, `SESSION SO FAR\n${hist}\n\nTHIS MOMENT: ${G.client} just said: "${m.line}"\nGUIDE for this moment:\n${guide}\n\nTherapist said: "${heard}"\n\nJSON:`, MODEL, 500); /* the stronger model: replies must always make sense */
      const parse = t => { try { const j = JSON.parse((String(t).match(/\{[\s\S]*\}/) || ["{}"])[0]); return { land: ["open", "guarded", "pull"].includes(j.land) ? j.land : "guarded", reply: spoken(j.reply || ""), note: clip(j.note, 300) }; } catch { return { land: "guarded", reply: "", note: "" }; } };
      let { land, reply, note } = parse(raw);
      if (!reply) {
        console.error("Guided voice: unparsed reply, retrying with the main model", JSON.stringify(raw).slice(0, 300));
        ({ land, reply, note } = parse(await claude(sys, `SESSION SO FAR\n${hist}\n\nTHIS MOMENT: ${G.client} just said: "${m.line}"\nGUIDE for this moment:\n${guide}\n\nTherapist said: "${heard}"\n\nReturn the JSON object now.`, MODEL, 1500)));
      }
      if (!reply) { console.error("Guided voice: no reply after retry"); return json(502, { error: "Dana didn’t come through that time. Say it again." }); }
      const t2 = Date.now(), audio = await tts(reply, voice), t3 = Date.now();
      return json(200, { ok: true, heard, land, reply, note, audio, parts: { listen: t1 - t0, think: t2 - t1, voice: t3 - t2 }, ms: t3 - t0 });
    }
    if (body.action === "clip") {
      if (!body.sessionId || !body.audio) return json(400, { error: "Missing clip" });
      try { await saveClip(user, body); } catch (e) { console.error("Voice clip error", e.message); }
      return json(200, { ok: true });
    }
    if (body.action === "log") {
      if (!body.sessionId) return json(400, { error: "Missing session" });
      try { await logSession(user, body, GUIDED[key]); } catch (e) { console.error("Voice log error", e.message); }
      return json(200, { ok: true });
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
      const gnote = G && Array.isArray(body.picks) && body.picks.length ? `\n\nThis was a GUIDED session. Each moment practiced one course skill, and Dana's reply showed how it landed (open = she opened up, guarded = she stayed where she was, pull = she pulled back):\n${body.picks.map((p, k) => `Moment ${k + 1} (${(G.moments[k] || {}).skill}): ${p}`).join("\n")}${body.retries ? `\nThey used "try this moment again" ${body.retries} time(s). If a retry changed how a moment landed, name what they changed.` : ""}\nUse this. Say which skills landed and which to practice.` : "";
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
    if (/^STT 4/.test(error.message)) return json(200, { ok: false, error: "I didn’t catch that. Try saying it again." });
    return json(502, { error: "Dana didn’t come through that time. Try again." });
  }
};
