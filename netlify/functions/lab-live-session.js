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
/* Keep whole sentences: never cut text mid-word. If something runs long, end at the last full sentence. */
const whole = (v, n = 1200) => { const t = String(v == null ? "" : v).replace(/\s+/g, " ").trim(); if (t.length <= n) return t; const cut = t.slice(0, n), end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "), cut.lastIndexOf(".\u201d"), cut.lastIndexOf("?\u201d")); return end > n * 0.4 ? cut.slice(0, end + 1).trim() : cut.slice(0, cut.lastIndexOf(" ")).trim() + "…"; };

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
FIRST, respond to what the therapist actually said or asked in their latest attempt. If they asked a question, answer that question (even briefly or hesitantly) before anything else. Only bring in background details when the therapist's words opened that door; don't jump ahead to topics they haven't touched.
Spoken words only: no *asterisks*, no (parentheses), no stage directions like pause or sighs. Show hesitation with words or "..." instead.
Dana changes gradually across the session. No sudden breakthroughs, but when the therapist keeps meeting her with curiosity, let her warm up noticeably: longer answers, a real detail, a little humor or honesty. Vary her sentence openings and length; don't repeat her earlier phrasing. Stay in the moment; don't fast-forward the session. Reveal background details only when the trainee earns them by getting curious.`;

function system(mode, sc) {
  const ctx = `CLIENT BACKGROUND (for you only)\n${sc.background}\n\nSETUP\n${sc.setup}`;
  if (mode === "note") return `${BASE}\n\n${ctx}\n\nYOUR JOB NOW: write the TRAINING NOTE on the trainee's latest attempt. Dana does not react yet.
TRAINING NOTE FORMAT. Return ONLY a JSON object: {"working": "...", "mode": "keep or build", "skill": "...", "build": "..."}
- "working" (ALWAYS): one sentence, max 22 words, naming specifically what the attempt did well or what it opened up. Every attempt has something; find the real one. No "but", "still", or "however".
- "skill" (ALWAYS): the name of ONE skill from the course list below, copied exactly.
- "build" (ALWAYS): one or two short sentences, max 32 words, teaching how that skill applies to THIS exact moment, tied to what Dana actually said and what the trainee actually did. Concrete and practical, the kind of thing an experienced clinician would point out in supervision. Point to what to notice or do differently; do not write their next line for them, and do not ask a vague reflective question. If a Pull clearly took over, use "Notice your Pull" and name it gently, as information, not a mistake.
- "mode" (ALWAYS): "keep" or "build".
  Use "keep" when the attempt already does the skill well: then "skill" is the skill they DEMONSTRATED and "build" says, in plain words, why it works with this client and when to reach for it again. Nothing to fix; no "but", "instead", "though", "could", "might want to", "missed".
  Use "build" only when there's a clear next layer: then "build" is ONE forward step ("Next time...", "To deepen this...", "Keep... and add..."), never a correction of what they said, and never "you missed", "instead of", "however", "but".
  Aim for roughly half "keep". A simple, warm, open response is often a "keep".
  REFINES: if this attempt applied what an earlier training note at this moment suggested, it is a "keep": credit that change specifically ("You brought in her word 'handed'...") and don't introduce a new critique.
COURSE SKILLS (from the Clinical Confidence Lab lessons):
- Notice your Pull (Rescue, Fix, Fill, Defend, Prove): the urge that takes over under pressure
- Respond to their meaning, not your discomfort
- Ask a question you genuinely want answered
- Leave room to be corrected: the client could disagree without taking care of your feelings
- Clarify when they're confused, instead of waiting it out
- Explore before explaining
- P.A.U.S.E. · Pause: slow down instead of rushing to respond
- P.A.U.S.E. · Attend: notice what's happening with the client and in you
- P.A.U.S.E. · Use what the client gave you: their exact words
- P.A.U.S.E. · Say one intentional response: one clear purpose
- P.A.U.S.E. · Explore: let their answer guide your next move
ENCOURAGEMENT: The goal is a trainee who keeps practicing and feels capable. Many attempts are reasonable; treat them that way. Never imply there was one right answer. "build" is the next layer of skill, not a correction.
VARIETY: Earlier training notes are in the transcript. Don't use the same skill as the previous note, and don't repeat earlier phrasing. Start from the SUGGESTED SKILL in the request, but pick a better-fitting one from the list if it clearly fits this moment better. Don't comment on body language, arms, or face, and don't invent details that aren't in the transcript.
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
- End with the one course skill to practice next (from the course skills list) and, in one sentence, why it fits what happened in this session.
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
  const SKILLS = ["P.A.U.S.E. · Use what the client gave you: their exact words", "Explore before explaining", "Respond to their meaning, not your discomfort", "Leave room to be corrected", "P.A.U.S.E. · Attend: notice what's happening with the client and in you", "Ask a question you genuinely want answered", "P.A.U.S.E. · Say one intentional response: one clear purpose", "P.A.U.S.E. · Explore: let their answer guide your next move", "Notice your Pull", "P.A.U.S.E. · Pause: slow down instead of rushing to respond"];
  /* suggest a different course skill for each training note, rotating through all before any repeats */
  const noteNo = moments.reduce((n, m) => n + (m.attempts || []).length, 0), lens = SKILLS[(noteNo - 1) % SKILLS.length];
  const ask = mode === "note"
    ? `SESSION SO FAR\n\n${t}\n\nWrite the training note on the therapist's latest attempt at Moment ${moments.length}.\nSUGGESTED SKILL for this note: ${lens}.`
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
      if (parts && (parts.working || parts.build)) {
        parts = { mode: parts.mode === "keep" ? "keep" : "build", working: whole(parts.working, 700), skill: clip(parts.skill, 120).replace(/:.*$/, ""), build: whole(parts.build, 800) };
        return json(200, { ok: true, parts, text: [parts.working, parts.build].filter(Boolean).join(" ") });
      }
    }
    return json(200, { ok: true, text: whole(text, 1400).replace(/^(Dana|Client|Training note)\s*:\s*/i, "").replace(/\*[^*]{0,40}\*\s*/g, "").replace(/\((?:pause|pauses|sighs?|beat|laughs?|quietly|shrugs?)[^)]{0,30}\)\s*/gi, "").replace(/^["“]|["”]$/g, "").trim() });
  } catch (error) {
    console.error("Live session AI failed", error.message, error.detail || "");
    return json(502, { error: "The practice partner is unavailable right now.", status: error.status || 0 });
  }
};
