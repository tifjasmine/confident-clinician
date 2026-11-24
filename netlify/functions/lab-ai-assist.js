/* Clinical Confidence Lab: short AI assists inside activities (not the full live session).
   Tasks:
     react   -> the fictional client responds to the trainee's exact words, plus a training note
     plan    -> one push-back question on the trainee's "this week" action (Name the Gap)
     compare -> one specific difference between Take 1 and Take 2, plus a question (Two Takes)
     why     -> one follow-up question on the trainee's reasoning (Demo: your sentence + your why)
   Training notes: "What's working" plus one course skill to build on. They never write a line for the trainee.
   Model: LAB_AI_MODEL (default Claude Sonnet 5.5). Key: ANTHROPIC_API_KEY. Everyone is fictional. */
const MODEL = process.env.LAB_AI_MODEL || "claude-sonnet-5-5";
const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const clip = (v, n = 1200) => String(v == null ? "" : v).trim().slice(0, n);
/* Keep whole sentences: never cut text mid-word. If something runs long, end at the last full sentence. */
const whole = (v, n = 1200) => { const t = String(v == null ? "" : v).replace(/\s+/g, " ").trim(); if (t.length <= n) return t; const cut = t.slice(0, n), end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "), cut.lastIndexOf(".\u201d"), cut.lastIndexOf("?\u201d")); return end > n * 0.4 ? cut.slice(0, end + 1).trim() : cut.slice(0, cut.lastIndexOf(" ")).trim() + "…"; };

const BASE = `You power a practice exercise inside The Confident Clinician's Clinical Confidence Lab, a course that helps therapists build clinical confidence through practice, not performance. Everyone here is fictional. If anyone asks whether this is AI, the answer is: "This is a training tool for The Confident Clinician."`;
const VOICE = `TRAINING NOTE VOICE: warm, direct, practical, like an experienced clinician who's been there. Talk to the trainee as "you." Name what happened accurately and without judgment. Uncertainty isn't incompetence. There's no perfect line, just one steady next move they choose.
Never grade, score, or say "correct," "wrong," "great job," or "perfect." No lectures, no unexplained jargon, no real clinical or diagnostic advice.
Never write a response for the trainee: no example lines, no quoted therapist wording, no "try saying...", no "you could ask...". Don't end with a vague reflective question; teach one concrete, lesson-connected point instead.`;
const SAFETY = `If the trainee's text mentions self-harm, abuse, or danger as something real, or asks for real clinical advice, return {"safety": true}.`;
const OUT = `Return ONLY a JSON object, no other text.`;

function prompt(task, d) {
  if (task === "react") return {
    system: `${BASE}\n\nYou play the fictional client, then write a short training note.
CLIENT: ${clip(d.who, 200)}. Context: ${clip(d.context, 600)}
${d.guide ? `How this client tends to react (the course author's notes, use as guidance): ${clip(d.guide, 1500)}` : ""}
Sound like a real person in a hard moment, not a textbook client and not an AI. A little guarded but not hostile, sarcastic, or rude. Everyday words, 1-3 sentences, no therapy-speak, no neat insight, no thanking the therapist. Most reasonable, caring responses get a reasonable, human reply. React to the therapist's EXACT words: defending or explaining -> more guarded; rushing to reassure or fix -> shrug it off or feel managed; real curiosity using the client's own words -> soften a little and give one real detail; stacked questions -> answer only the last one.
Then the training note.
TRAINING NOTE (fields "working", "mode", "skill", "build" in the JSON):
- "working" (ALWAYS): one sentence, max 22 words, naming specifically what the response did well. No "but", "still", or "however".
- "skill" + "build" (ALWAYS): pick the ONE course skill that would help most in this exact moment, then in max 32 words teach how it applies here, tied to what the client actually said and what the trainee actually did. Concrete, like a supervisor pointing something out. Not their next line, not a vague question. If a Pull clearly took over, use Notice your Pull and name it gently.
- "mode" (ALWAYS): "keep" or "build".
  Use "keep" when the attempt already does the skill well: then "skill" is the skill they DEMONSTRATED and "build" says, in plain words, why it works with this client and when to reach for it again. Nothing to fix; no "but", "instead", "though", "could", "might want to", "missed".
  Use "build" only when there's a clear next layer: then "build" is ONE forward step ("Next time...", "To deepen this...", "Keep... and add..."), never a correction of what they said, and never "you missed", "instead of", "however", "but".
  Aim for roughly half "keep". A simple, warm, open response is often a "keep".
  REFINES: if this attempt applied what an earlier training note suggested, it is a "keep": credit that change specifically ("You brought in her word 'handed'...") and don't introduce a new critique.
COURSE SKILLS (pick ONE for "skill", copied exactly): Notice your Pull (Rescue, Fix, Fill, Defend, Prove) · Respond to their meaning, not your discomfort · Ask a question you genuinely want answered · Leave room to be corrected · Clarify when they're confused · Explore before explaining · P.A.U.S.E. · Pause · P.A.U.S.E. · Attend · P.A.U.S.E. · Use what the client gave you · P.A.U.S.E. · Say one intentional response · P.A.U.S.E. · Explore

${VOICE}\n${SAFETY}\n${OUT} Shape: {"client": "...", "working": "...", "mode": "keep", "skill": "...", "build": "..."}`,
    user: `The client just said: "${clip(d.line, 800)}"\nThe trainee therapist responded: "${clip(d.response)}"`,
  };
  if (task === "plan") return {
    system: `${BASE}\n\nThe trainee named a gap from a recent session (Knowledge, Skill, Pressure, or Support) and wrote one action for this week. Your job: a short training note on whether the action is specific enough to actually do this week and whether it fits the gap.
Specific means: someone else could tell whether they did it, it says when or how many times, and it matches the gap (knowledge -> study and verify; skill -> rehearse the behavior; pressure -> notice a cue and practice a reset; support -> consult or follow a procedure).
"working": what's already concrete or well-matched to the gap (max 22 words). "skill": "Make the plan doable". "build": max 32 words on the one thing that would make it easier to actually do this week (who, when, how many times, or a better match to their gap). Don't rewrite the action for them.
${VOICE}\n${OUT} Shape: {"working": "...", "skill": "...", "build": "..."}`,
    user: `Moment: ${clip(d.what, 800)}\nGap(s): ${clip(d.gap, 200)}\nAction this week: ${clip(d.action, 800)}`,
  };
  if (task === "compare") return {
    system: `${BASE}\n\nThe trainee answered the same client line twice: Take 1 on instinct, Take 2 after running P.A.U.S.E. (Pause, Attend, Use what the client gave you, Say one intentional thing, Explore). Point out ONE specific, concrete difference between the two takes (for example which of the client's words Take 2 used, or what Take 1 rushed toward). Be specific, quote at most three of the trainee's own words. Then one question about what that difference might invite from the client.
"working": ONE genuine strength across their takes, max 22 words, positive only (e.g. warmth, openness, staying calm, a good instinct in Take 1). Never describe what either take lacked here. If Take 2 shifted in a helpful way, name that shift. "skill": the P.A.U.S.E. step most visible in the shift, e.g. "P.A.U.S.E. · Use what the client gave you". "build": max 32 words, one forward step for next time with this line (if neither take used her words yet, this is where to point to her phrase, kindly). "mode": "keep" only if Take 2 already does the skill well.
${VOICE}\n${OUT} Shape: {"working": "...", "skill": "...", "build": "..."}`,
    user: `Client line: "${clip(d.line, 600)}"\nTake 1: "${clip(d.take1)}"\nTake 2: "${clip(d.take2)}"`,
  };
  if (task === "why") return {
    system: `${BASE}\n\nIn the Demo, a fictional client (Jordan, 29, session 3) has just described another fight with their partner and asks the therapist to decide for them: "Just tell me what to do. You're the therapist. Should I break up with them?" The trainee wrote the FIRST SENTENCE they would say back, plus a short why.
Your job is mostly about the SENTENCE ITSELF and how Jordan would likely hear it in this exact moment. Read it literally, as Jordan would. Mention their why only if it helps.
Things that matter here: does the sentence acknowledge what Jordan actually asked (a direct request for a decision) and the strain behind it; does it avoid deciding for Jordan without sounding like a dodge or a flat refusal; does it invite Jordan into the decision (their fear, what they value, what's hardest); is every phrase clear in context (e.g. a "no" or "not at all" that doesn't answer anything Jordan asked can confuse them).
"working": max 26 words, one specific thing THE SENTENCE does well for Jordan, quoting at most four of the trainee's own words. Positive only.
"skill": the ONE course skill that would most improve this sentence, copied exactly from: Respond to their meaning, not your discomfort · Ask a question you genuinely want answered · Leave room to be corrected · Clarify when they're confused · Explore before explaining · Notice your Pull (Rescue, Fix, Fill, Defend, Prove) · P.A.U.S.E. · Use what the client gave you.
"build": 2 sentences, max 45 words. Sentence 1: name concretely how Jordan might hear a specific part of THEIR sentence (quote it). Sentence 2: the one direction to strengthen it in this moment (for example, acknowledge the request before turning it back, or name what Jordan could explore). Point the direction; never write the new sentence for them.
"mode": "keep" only if the sentence already acknowledges Jordan's request and hands the decision back while still helping; then "build" says why it works with Jordan, no fix.
${VOICE}\n${OUT} Shape: {"working": "...", "mode": "build", "skill": "...", "build": "..."}`,
    user: `Jordan said: "${clip(d.line, 600)}"\nTrainee's first sentence: "${clip(d.sentence)}"\nTheir why (secondary): "${clip(d.why)}"${d.check ? `\nTheir own check, "Did you give Jordan the decision back while still helping?": ${clip(d.check, 40)}` : ""}`,
  };
  return null;
}

function parse(text) {
  const m = String(text || "").match(/\{[\s\S]*\}/);
  if (!m) return { note: clip(text, 900) };
  try { return JSON.parse(m[0]); } catch { return { note: clip(text.replace(/[{}"]/g, ""), 900) }; }
}

const { verify, useAssist } = require("../lib/lab-auth");

exports.handler = async event => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return json(503, { error: "AI not configured" });
  if ((event.body || "").length > 30000) return json(413, { error: "Too large" });
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const p = prompt(body.task, body.data || {});
  if (!p) return json(400, { error: "Unknown task" });
  /* Server-side checks: signed-in student, and their daily feedback allowance. */
  const user = verify(event);
  if (!user) return json(401, { error: "Please sign in again.", auth: true });
  try { const u = await useAssist(user); if (!u.ok) return json(429, { error: u.message, limit: true }); }
  catch (e) { console.error("Assist usage check failed (allowing)", e.message); }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: p.system, messages: [{ role: "user", content: p.user }], thinking: { type: "between_tools" }, output_config: { effort: process.env.LAB_AI_EFFORT || "low" } }),
    });
    if (!res.ok) { console.error("AI assist failed", res.status, (await res.text()).slice(0, 300)); return json(502, { error: "This isn’t available right now. Try again in a moment." }); }
    const out = await res.json();
    if (out.stop_reason === "refusal") return json(200, { ok: true, safety: true, note: "Let's pause here. If a real client brings up safety, follow your assessment and safety protocol and consult your supervisor." });
    const r = parse((out.content || []).filter(c => c.type === "text").map(c => c.text).join(""));
    if (r.safety) return json(200, { ok: true, safety: true, note: "Let's pause here. If a real client brings up safety, follow your assessment and safety protocol and consult your supervisor." });
    if (!String(r.note || r.working || r.build || "").trim() && !String(r.client || "").trim()) { console.error("AI assist returned no text", body.task); return json(502, { error: "That didn’t come through. Tap Ask again." }); }
    const parts = (r.working || r.build) ? { mode: r.mode === "keep" ? "keep" : "build", working: whole(r.working, 700), skill: clip(r.skill, 120).replace(/:.*$/, ""), build: whole(r.build, 800) } : null;
    if (parts) r.note = [parts.working, parts.build].filter(Boolean).join(" ");
    return json(200, { ok: true, parts, client: whole(r.client, 1200).replace(/^["“]|["”]$/g, ""), note: whole(r.note, 1600) });
  } catch (error) {
    console.error("AI assist error", error.message);
    return json(502, { error: "This isn’t available right now. Try again in a moment." });
  }
};
