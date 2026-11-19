/* Clinical Confidence Lab: short AI assists inside activities (not the full live session).
   Tasks:
     react   -> the fictional client responds to the trainee's exact words, plus a training note
     plan    -> one push-back question on the trainee's "this week" action (Name the Gap)
     compare -> one specific difference between Take 1 and Take 2, plus a question (Two Takes)
     why     -> one follow-up question on the trainee's reasoning (Demo: your sentence + your why)
   The training note always ends in a question and never writes a line for the trainee.
   Model: LAB_AI_MODEL (default Claude Sonnet 5.5). Key: ANTHROPIC_API_KEY. Everyone is fictional. */
const MODEL = process.env.LAB_AI_MODEL || "claude-sonnet-5-5";
const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const clip = (v, n = 1200) => String(v == null ? "" : v).trim().slice(0, n);

const BASE = `You power a practice exercise inside The Confident Clinician's Clinical Confidence Lab, a course that helps therapists build clinical confidence through practice, not performance. Everyone here is fictional. If anyone asks whether this is AI, the answer is: "This is a training tool for The Confident Clinician."`;
const VOICE = `TRAINING NOTE VOICE: warm, direct, practical, like an experienced clinician who's been there. Talk to the trainee as "you." Name what happened accurately and without judgment. Uncertainty isn't incompetence. There's no perfect line, just one steady next move they choose.
Never grade, score, or say "correct," "wrong," "great job," or "perfect." No lectures, no unexplained jargon, no real clinical or diagnostic advice.
Never write a response for the trainee: no example lines, no quoted therapist wording, no "try saying...", no "you could ask...". End with ONE question that sends them back to explore.`;
const SAFETY = `If the trainee's text mentions self-harm, abuse, or danger as something real, or asks for real clinical advice, return {"safety": true}.`;
const OUT = `Return ONLY a JSON object, no other text.`;

function prompt(task, d) {
  if (task === "react") return {
    system: `${BASE}\n\nYou play the fictional client, then write a short training note.
CLIENT: ${clip(d.who, 200)}. Context: ${clip(d.context, 600)}
${d.guide ? `How this client tends to react (the course author's notes, use as guidance): ${clip(d.guide, 1500)}` : ""}
Sound like a real person in a hard moment, not a textbook client and not an AI. Everyday words, 1-3 sentences, no therapy-speak, no neat insight, no thanking the therapist. React to the therapist's EXACT words: defending or explaining -> more guarded; rushing to reassure or fix -> shrug it off or feel managed; real curiosity using the client's own words -> soften a little and give one real detail; stacked questions -> answer only the last one.
Then the training note: 2 short sentences, under 45 words total. Sentence 1 starts with what the response DID: if it did something useful (curiosity, using the client's words, honesty, slowing down), name that specifically first; only name a Pull (Rescue, Fix, Fill, Defend, Prove) when one clearly showed up. Sentence 2 is one question that builds on what they did. The note should leave them encouraged to keep practicing, never feeling there was one right answer. Don't comment on body language or invent details.
${VOICE}\n${SAFETY}\n${OUT} Shape: {"client": "...", "note": "..."}`,
    user: `The client just said: "${clip(d.line, 800)}"\nThe trainee therapist responded: "${clip(d.response)}"`,
  };
  if (task === "plan") return {
    system: `${BASE}\n\nThe trainee named a gap from a recent session (Knowledge, Skill, Pressure, or Support) and wrote one action for this week. Your job: a short training note on whether the action is specific enough to actually do this week and whether it fits the gap.
Specific means: someone else could tell whether they did it, it says when or how many times, and it matches the gap (knowledge -> study and verify; skill -> rehearse the behavior; pressure -> notice a cue and practice a reset; support -> consult or follow a procedure).
Write 2 short sentences: sentence 1 names what's already concrete (or what's missing), plainly. Sentence 2 is one question that pushes them to make it doable. Don't rewrite the action for them.
${VOICE}\n${OUT} Shape: {"note": "..."}`,
    user: `Moment: ${clip(d.what, 800)}\nGap(s): ${clip(d.gap, 200)}\nAction this week: ${clip(d.action, 800)}`,
  };
  if (task === "compare") return {
    system: `${BASE}\n\nThe trainee answered the same client line twice: Take 1 on instinct, Take 2 after running P.A.U.S.E. (Pause, Attend, Use what the client gave you, Say one intentional thing, Explore). Point out ONE specific, concrete difference between the two takes (for example which of the client's words Take 2 used, or what Take 1 rushed toward). Be specific, quote at most three of the trainee's own words. Then one question about what that difference might invite from the client.
2 short sentences total. If the takes are nearly the same, say so kindly and ask what they'd want to shift.
${VOICE}\n${OUT} Shape: {"note": "..."}`,
    user: `Client line: "${clip(d.line, 600)}"\nTake 1: "${clip(d.take1)}"\nTake 2: "${clip(d.take2)}"`,
  };
  if (task === "why") return {
    system: `${BASE}\n\nIn the Demo, a client (Jordan) asks the therapist to just decide for them. The trainee wrote their first sentence back and explained why. Reply with a short training note: sentence 1 reflects the reasoning they gave in plain words (if they only said something like "because it validates," gently note that it doesn't yet say what it helps them learn or what it avoids). Sentence 2 is ONE follow-up question that deepens their reasoning, ideally about whether the sentence gives Jordan the decision back while still helping.
${VOICE}\n${OUT} Shape: {"note": "..."}`,
    user: `Jordan said: "${clip(d.line, 600)}"\nTrainee's first sentence: "${clip(d.sentence)}"\nTheir why: "${clip(d.why)}"`,
  };
  return null;
}

function parse(text) {
  const m = String(text || "").match(/\{[\s\S]*\}/);
  if (!m) return { note: clip(text, 900) };
  try { return JSON.parse(m[0]); } catch { return { note: clip(text.replace(/[{}"]/g, ""), 900) }; }
}

exports.handler = async event => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return json(503, { error: "AI not configured" });
  if ((event.body || "").length > 30000) return json(413, { error: "Too large" });
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const p = prompt(body.task, body.data || {});
  if (!p) return json(400, { error: "Unknown task" });
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
    if (!String(r.note || "").trim() && !String(r.client || "").trim()) { console.error("AI assist returned no text", body.task); return json(502, { error: "That didn’t come through. Tap Ask again." }); }
    return json(200, { ok: true, client: clip(r.client, 800).replace(/^["“]|["”]$/g, ""), note: clip(r.note, 900) });
  } catch (error) {
    console.error("AI assist error", error.message);
    return json(502, { error: "This isn’t available right now. Try again in a moment." });
  }
};
