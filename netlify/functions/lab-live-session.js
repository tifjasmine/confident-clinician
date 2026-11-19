/* Clinical Confidence Lab: AI live practice session ("Live session with Dana").
   The page runs the session (moments, refines, counting). This function only writes one piece at a time:
     mode "note"    -> a Training note on the trainee's latest attempt (the client does NOT react yet)
     mode "client"  -> Dana's next line, reacting to the trainee's latest attempt
     mode "wrap"    -> Dana's closing line + the Session summary
   Prompts live here on the server, not in the page. Model: LAB_AI_MODEL (default Claude Sonnet 5.5).
   Key: ANTHROPIC_API_KEY (Netlify environment variable). Everyone in the scenario is fictional.
   Access: the shared preview test account is unlimited for testing. Real students will sign in with
   Supabase; when that's wired, pass their access token and the 3-refine / daily limits apply server-side. */
const MODEL = process.env.LAB_AI_MODEL || "claude-sonnet-5-5";
const MAX_ATTEMPT = 1200, MAX_TURNS = 60;

const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const clip = (v, n) => String(v == null ? "" : v).replace(/\s+\n/g, "\n").trim().slice(0, n);

const SCENARIOS = {
  dana: {
    opening: "Honestly? I think you don't understand me either. Everyone just keeps giving me homework.",
    setup: "Session 6. Last week the therapist suggested a thought record. The client didn't do it. Arms crossed, she says the opening line.",
    background: "Dana, 34, ER nurse working 12-hour shifts. Came to therapy for anxiety and burnout. Feels \"managed\" by everyone: her manager hands her protocols, her mom sends self-help links, her last therapist gave worksheets. What she wants is for someone to ask what her week was like and listen without fixing. She skipped the thought record because she was exhausted and it felt like one more assignment she'd fail.",
  },
};

const BASE = `You power a practice exercise inside The Confident Clinician's Clinical Confidence Lab, a course that helps therapists build clinical confidence through practice, not performance. Everyone here is fictional. If anyone asks whether this is AI, the answer is: "This is a training tool for The Confident Clinician."`;

const VOICE = `Voice: warm, direct, practical, like an experienced clinician who's been there. Talk to the trainee as "you." Name what happened accurately and without judgment. Uncertainty isn't incompetence. There's no perfect line, just one steady next move they choose.
Never grade, score, or say "correct," "wrong," "great job," or "perfect." No lectures, no unexplained jargon, no real clinical or diagnostic advice. Never write a response for the trainee: no example lines, no quoted therapist wording, no "try saying...", no "you could ask...".`;

const SAFETY = `SAFETY: If the trainee's latest attempt mentions self-harm, abuse, or danger, or tries to get real clinical advice, reply with exactly: SAFETY_PAUSE`;

const CLIENT_RULES = `Sound like a real person in a hard moment, not a textbook client and not an AI. Guarded at the start, but not hostile, sarcastic, or rude, and never mocking the therapist. Everyday words. No therapy-speak, no neat insight, no thanking the therapist. 1-3 sentences.
React to the therapist's exact words in their latest attempt:
- Most reasonable, caring responses get a reasonable, human reply: she answers, maybe a little hesitantly.
- Push back only some of the time (no more than about one reply in three), mainly when the therapist defends, lectures, or stacks questions.
- Defends, explains, or justifies: more guarded or flat.
- Rushes to reassure or apologizes a lot: shrugs it off, or feels she has to take care of them.
- Drops the homework fast to keep the peace: relief that doesn't really land.
- Gets curious about what's missing, using her words: softens a little and gives one real detail.
- Asks several questions at once: answers only the last one, or none.
Dana changes gradually across the session. No sudden breakthroughs, but when the therapist keeps meeting her with curiosity, let her warm up noticeably: longer answers, a real detail, a little humor or honesty. Vary her sentence openings and length; don't repeat her earlier phrasing. Stay in the moment; don't fast-forward the session. Reveal background details only when the trainee earns them by getting curious.`;

function system(mode, sc) {
  const ctx = `CLIENT BACKGROUND (for you only)\n${sc.background}\n\nSETUP\n${sc.setup}`;
  if (mode === "note") return `${BASE}\n\n${ctx}\n\nYOUR JOB NOW: write the TRAINING NOTE on the trainee's latest attempt. Dana does not react yet.
TRAINING NOTE FORMAT. Return ONLY a JSON object: {"working": "...", "watch": "...", "question": "..."}
- "working" (ALWAYS): one sentence, max 22 words, naming specifically what the attempt did well or what it opened up. Every attempt has something; find the real one. No "but", "still", or "however" in this sentence.
- "watch" (OFTEN EMPTY): leave it "" unless something clearly closed the client down, or a Pull (Rescue, Fix, Fill, Defend, Prove) clearly took over. Leave it empty for at least half of attempts. Never nitpick word choice, tone, or small additions. Max 20 words, said as information, not a mistake.
- "question" (ALWAYS): one curious question, max 20 words, that helps them go one step further from what they did. Not a hint that they were wrong.
ENCOURAGEMENT: The goal is a trainee who keeps practicing and feels capable. Many attempts are reasonable; treat them that way. Never imply there was one right answer.
VARIETY: Earlier training notes are in the transcript. Do NOT repeat their focus, their question shape, or their phrasing. Use the FOCUS given in the request for this note. Don't comment on body language, arms, or face, and don't invent details that aren't in the transcript.
If this is a refine, "working" can name what shifted from their earlier attempt at this same moment.
${VOICE}\n\n${SAFETY}`;
  if (mode === "client") return `${BASE}\n\n${ctx}\n\nYOUR JOB NOW: you are Dana. Write ONLY Dana's next spoken line, reacting to the therapist's latest attempt. No quotes, no name label, no stage directions longer than three words, no training note.
${CLIENT_RULES}\n\n${SAFETY}`;
  return `${BASE}\n\n${ctx}\n\nYOUR JOB NOW: the session is over. Write two parts, separated by a line containing only ---
PART 1: one natural closing line from Dana, true to where she ended up. Spoken words only, no quotes or label.
PART 2: the Session summary, in The Confident Clinician voice, under 150 words, as short paragraphs (no headings, no bullets):
- Where Dana started and where she ended up.
- The moment it opened up most, and what the trainee did right before it.
- The moment it closed down most, and what was going on in them (name any Pull).
- What their refines changed, if they used any.
- End with one question to carry into their next practice (a question, not advice).
${VOICE}`;
}

/* Render the session so far as a readable transcript for the model */
function transcript(sc, moments) {
  const lines = [];
  moments.slice(0, MAX_TURNS).forEach((m, k) => {
    lines.push(`MOMENT ${k + 1}\nDana: ${clip(m.client, 600)}`);
    (m.attempts || []).forEach((a, j) => {
      lines.push(`Therapist attempt${(m.attempts.length > 1) ? ` ${j + 1}${j < m.attempts.length - 1 ? " (later refined)" : " (latest)"}` : ""}: ${clip(a.text, MAX_ATTEMPT)}`);
      if (a.note) lines.push(`Training note given: ${clip(a.note, 600)}`);
    });
  });
  return lines.join("\n\n");
}

async function claude(sys, user, maxTokens) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system: sys, messages: [{ role: "user", content: user }], thinking: { type: "between_tools" }, output_config: { effort: process.env.LAB_AI_EFFORT || "low" } }),
  });
  if (!res.ok) { const d = await res.text(); const e = new Error(`Anthropic ${res.status}`); e.status = res.status; e.detail = d.slice(0, 400); throw e; }
  const out = await res.json();
  if (out.stop_reason === "refusal") return "SAFETY_PAUSE";
  return (out.content || []).filter(c => c.type === "text").map(c => c.text).join("").trim();
}

exports.handler = async event => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return json(503, { error: "AI not configured" });
  if ((event.body || "").length > 120000) return json(413, { error: "Too large" });
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const sc = SCENARIOS[body.scenario];
  const mode = ["note", "client", "wrap"].includes(body.mode) ? body.mode : "";
  const moments = Array.isArray(body.moments) ? body.moments : [];
  if (!sc || !mode || !moments.length) return json(400, { error: "Missing scenario, mode or moments" });
  const cur = moments[moments.length - 1];
  if ((mode === "note" || mode === "client") && !(cur.attempts && cur.attempts.length)) return json(400, { error: "No attempt yet" });

  const t = transcript(sc, moments);
  const LENSES = [
    "Dana's exact words: which word or phrase of hers matters most right now",
    "what Dana might be feeling underneath what she said",
    "what Dana seems to want from the therapist in this moment",
    "the therapist's own urge or pull right now",
    "pacing: how much the therapist said, and whether there's room for Dana",
    "what's working between them right now, and how to build on it",
    "where this conversation could go next, and what would help Dana stay in it",
    "what would help Dana feel listened to rather than managed",
    "the strength in the trainee's attempt and how to use it on purpose",
  ];
  /* one focus per training note, rotating through all of them before any repeats */
  const noteNo = moments.reduce((n, m) => n + (m.attempts || []).length, 0), lens = LENSES[(noteNo - 1 + (moments[0].attempts && moments[0].attempts[0] ? moments[0].attempts[0].text.length : 0)) % LENSES.length];
  const ask = mode === "note"
    ? `SESSION SO FAR\n\n${t}\n\nWrite the training note on the therapist's latest attempt at Moment ${moments.length}.\nFOCUS for this note: ${lens}.`
    : mode === "client"
      ? `SESSION SO FAR\n\n${t}\n\nWrite Dana's next line, reacting to the therapist's latest attempt at Moment ${moments.length}.`
      : `FULL SESSION\n\n${t}\n\nThe session is over. Write Dana's closing line, then ---, then the Session summary.`;
  try {
    let text = await claude(system(mode, sc), ask, mode === "wrap" ? 3000 : 1500);
    if (!text) text = await claude(system(mode, sc), ask + "\n\nReply now with the text only.", mode === "wrap" ? 3000 : 1500);
    if (!text) { console.error("Live session AI returned no text", mode); return json(502, { error: "Dana didn’t come through that time. Tap Try again." }); }
    if (/SAFETY_PAUSE/.test(text)) return json(200, { ok: true, safety: true, text: "Let's pause the role-play here. If a real client brings up safety, follow your assessment and safety protocol and consult your supervisor." });
    if (mode === "wrap") { const [closing, ...rest] = text.split(/\n\s*---+\s*\n/); return json(200, { ok: true, closing: clip(closing, 600).replace(/^["“]|["”]$/g, ""), summary: clip(rest.join("\n"), 2500) }); }
    if (mode === "note") {
      let parts = null; const m = text.match(/\{[\s\S]*\}/);
      try { parts = m ? JSON.parse(m[0]) : null; } catch { parts = null; }
      if (parts && (parts.working || parts.question)) {
        parts = { working: clip(parts.working, 300), watch: clip(parts.watch, 300), question: clip(parts.question, 300) };
        return json(200, { ok: true, parts, text: [parts.working, parts.watch, parts.question].filter(Boolean).join(" ") });
      }
    }
    return json(200, { ok: true, text: clip(text, 900).replace(/^(Dana|Client|Training note)\s*:\s*/i, "").replace(/^["“]|["”]$/g, "") });
  } catch (error) {
    console.error("Live session AI failed", error.message, error.detail || "");
    return json(502, { error: "The practice partner is unavailable right now.", status: error.status || 0 });
  }
};
