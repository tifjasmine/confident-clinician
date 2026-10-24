(() => {
  const publicApi = "/.netlify/functions/practice-library";
  const adminApi = "/.netlify/functions/practice-funnel-admin";
  const root = document.querySelector("[data-exercise-root]");
  const status = document.querySelector("[data-page-status]");
  const params = new URLSearchParams(location.search);
  const slug = params.get("slug") || location.pathname.split("/").filter(Boolean).pop();
  const previewId = params.get("previewId") || "";
  const source = params.get("source") || "direct";
  const campaign = params.get("campaign") || params.get("utm_campaign") || "";
  const referralToken = params.get("ref") || "";
  const keyword = params.get("keyword") || "";
  const triggerType = params.get("trigger") || "";
  const escape = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
  let exercise;
  let roundOneAttempt = {};
  let sessionId = localStorage.getItem("tccPracticeSession");
  if (!sessionId) { sessionId = crypto.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`; localStorage.setItem("tccPracticeSession", sessionId); }

  const disclosure = () => exercise.saveFreeTextResponses
    ? '<p class="privacy-note">Your written response will be saved to support review and future clinical teaching. Please don\'t include names or identifying client information.</p>'
    : '<p class="privacy-note">Please don\'t include names or identifying client information.</p>';

  const choiceMarkup = (choices, name = "choice") => `<div class="choices">${(choices || []).map((choice) => `<label class="choice"><input type="radio" name="${name}" value="${escape(choice.label)}"><span><strong>${escape(choice.label)}.</strong> ${escape(choice.response)}</span></label>`).join("")}</div>`;

  const prompt = () => {
    const responseCheck = exercise.type === "The Clinical Response Check";
    document.title = `${exercise.title} | The Confident Clinician`;
    root.innerHTML = `<header class="exercise-head"><p class="eyebrow">${escape(exercise.type)} · ${escape(exercise.number)}</p><h1>${escape(exercise.title)}</h1>${exercise.roundTwoEnabled ? '<span class="challenge-label">Two-Round Challenge</span>' : ""}</header>
      <section class="moment ${responseCheck ? "response-check" : "case-lab"}">
        <p class="format-kicker">${responseCheck ? "Observe and reflect" : "Choose your clinical move"}</p>
        <h2>${responseCheck ? "The Clinical Response Check" : "Clinical Case Lab"}</h2>
        <p class="exercise-intro">${responseCheck ? "Take a closer look at a therapist's response. Identify what's working, what might be missing, and how you might respond differently." : "You're the therapist now. Read the client scenario, choose your next clinical move, and explore the reasoning behind each option."}</p>
        ${responseCheck
          ? `<div class="quote-block"><span>Client says</span><blockquote>“${escape(exercise.clientStatement)}”</blockquote></div><div class="quote-block"><span>Therapist responds</span><blockquote>“${escape(exercise.therapistResponse)}”</blockquote></div>`
          : `<div class="quote-block"><span>Clinical scenario</span><blockquote>${escape(exercise.caseScenario)}</blockquote></div>${exercise.clientStatement ? `<div class="quote-block client-turn"><span>Client says</span><blockquote>“${escape(exercise.clientStatement)}”</blockquote></div>` : ""}`}
        <form class="participation" data-attempt-form>
          <label for="thinking">${escape(exercise.reflectionQuestion || (responseCheck ? "Take a closer look at the therapist's response. What stands out to you clinically?" : "What would you say next?"))}</label>
          ${responseCheck ? '<textarea class="answer-box" id="thinking" name="response" minlength="12" required placeholder="I notice that..."></textarea>' : `${choiceMarkup(exercise.choices)}<textarea class="answer-box optional-rationale" id="thinking" name="rationale" placeholder="Optional: Why did you choose this response?"></textarea>`}
          ${disclosure()}
          ${exercise.hint ? `<details class="hint"><summary>Need a thinking prompt?</summary><p>${escape(exercise.hint)}</p></details>` : ""}
          <div class="submit-row"><button class="button" type="submit" disabled>${responseCheck ? "Submit & See the Breakdown" : "Submit My Clinical Decision"}</button><span class="status" data-submit-status></span></div>
        </form>
      </section>`;
    const form = root.querySelector("[data-attempt-form]");
    const button = form.querySelector("button");
    const update = () => { button.disabled = responseCheck ? form.response.value.trim().length < 12 : !form.querySelector('input[name="choice"]:checked'); };
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    form.addEventListener("submit", submitRoundOne);
  };

  const submitRoundOne = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    const message = form.querySelector("[data-submit-status]");
    const selected = form.querySelector('input[name="choice"]:checked')?.value || "";
    roundOneAttempt = { response: form.response?.value || "", selectedOption: selected, rationale: form.rationale?.value || "" };
    button.disabled = true;
    message.textContent = exercise.roundTwoEnabled ? "Opening the next clinical moment…" : "Preparing the clinical breakdown…";
    if (previewId) {
      if (exercise.roundTwoEnabled) renderRoundTwo("admin-preview");
      else renderReveal(exercise, roundOneAttempt, "preview-attempt");
      return;
    }
    try {
      window.tccTrack?.("practice_submission", { exercise_slug: slug, exercise_type: exercise.type, source, campaign, round: 1 });
      const response = await fetch(`${publicApi}?action=submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, ...roundOneAttempt, sessionId, source, campaign, keyword, triggerType, referralToken, referrer: document.referrer }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      if (data.requiresRoundTwo) renderRoundTwo(data.continuationToken, data.roundTwo);
      else completeReveal(data.exercise, data.attemptId);
    } catch (error) { message.textContent = error.message; button.disabled = false; }
  };

  const renderRoundTwo = (token, roundTwo = exercise) => {
    root.querySelector(".moment")?.remove();
    const format = roundTwo.answerFormat || exercise.roundTwoAnswerFormat || "Free text";
    const choices = roundTwo.choices || exercise.roundTwoChoices || [];
    root.insertAdjacentHTML("beforeend", `<section class="moment case-lab round-two">
      <p class="format-kicker">Round Two · New information</p>
      <h2>The clinical picture just changed.</h2>
      <div class="your-thinking compact"><p class="eyebrow">Your Round One decision</p><p><strong>${escape(roundOneAttempt.selectedOption)}</strong> · ${escape(exercise.choices.find((item) => item.label === roundOneAttempt.selectedOption)?.response || "")}</p></div>
      <div class="quote-block client-turn"><span>Client responds</span><blockquote>“${escape(roundTwo.clientResponse || exercise.roundTwoClientResponse)}”</blockquote></div>
      <form class="participation" data-round-two-form>
        <label for="round-two-thinking">${escape(roundTwo.question || exercise.roundTwoQuestion || "What would you do next?")}</label>
        ${format === "Multiple choice" ? choiceMarkup(choices, "roundTwoChoice") + '<textarea class="answer-box optional-rationale" id="round-two-thinking" name="roundTwoRationale" placeholder="Optional: Why did you choose this response?"></textarea>' : '<textarea class="answer-box" id="round-two-thinking" name="roundTwoResponse" minlength="12" required placeholder="I might say or explore..."></textarea>'}
        ${disclosure()}
        <div class="submit-row"><button class="button" type="submit" disabled>Complete & See the Breakdown</button><span class="status" data-submit-status></span></div>
      </form>
    </section>`);
    const form = root.querySelector("[data-round-two-form]");
    const button = form.querySelector("button");
    const update = () => { button.disabled = format === "Multiple choice" ? !form.querySelector('input[name="roundTwoChoice"]:checked') : form.roundTwoResponse.value.trim().length < 12; };
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const selected = form.querySelector('input[name="roundTwoChoice"]:checked')?.value || "";
      const roundTwoAttempt = { roundTwoResponse: form.roundTwoResponse?.value || "", roundTwoSelectedOption: selected, roundTwoRationale: form.roundTwoRationale?.value || "" };
      const message = form.querySelector("[data-submit-status]");
      button.disabled = true;
      message.textContent = "Preparing both clinical decisions…";
      if (previewId) { completeReveal(exercise, "preview-attempt", roundTwoAttempt); return; }
      try {
        const response = await fetch(`${publicApi}?action=submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, roundTwoToken: token, ...roundTwoAttempt, rationale: roundOneAttempt.rationale, sessionId, source, campaign, keyword, triggerType, referralToken, referrer: document.referrer }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        completeReveal(data.exercise, data.attemptId, roundTwoAttempt);
      } catch (error) { message.textContent = error.message; button.disabled = false; }
    });
    root.querySelector(".round-two")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  const completeReveal = (item, attemptId, roundTwoAttempt = {}) => {
    renderReveal(item, { ...roundOneAttempt, ...roundTwoAttempt }, attemptId);
    if (!previewId) {
      window.tccTrack?.("practice_breakdown_reveal", { exercise_slug: slug, exercise_type: exercise.type, source, campaign });
      window.tccTrack?.("practice_exercise_completed", { exercise_slug: slug, exercise_type: exercise.type, source });
    }
  };

  const responseCheckAnalysis = (item) => `
    ${item.clinicalConsideration || item.therapistIntention ? `<section class="reveal-section clinical-framing"><p class="eyebrow">The clinical consideration</p>${item.clinicalConsideration ? `<h2>${escape(item.clinicalConsideration)}</h2>` : ""}${item.clinicalConsiderationExplanation ? `<p>${escape(item.clinicalConsiderationExplanation)}</p>` : ""}${item.therapistIntention ? `<div class="intention-note"><h3>What the therapist was trying to accomplish</h3><p>${escape(item.therapistIntention)}</p></div>` : ""}</section>` : ""}
    ${item.clinicalPoints?.length ? `<section class="reveal-section"><p class="eyebrow">What might be missing</p><div class="teaching-list">${item.clinicalPoints.map((point) => `<article class="teaching-point"><h3>${escape(point.title)}</h3><p>${escape(point.body)}</p>${point.implication ? `<p class="implication"><strong>Potential implication:</strong> ${escape(point.implication)}</p>` : ""}</article>`).join("")}</div></section>` : ""}
    ${item.alternatives?.length ? `<section class="reveal-section"><p class="eyebrow">Three ways to respond</p><div class="alternatives">${item.alternatives.map((alternative) => `<article class="alternative"><h3>${escape(alternative.title || `Option ${alternative.label}`)}</h3><blockquote>“${escape(alternative.response)}”</blockquote><p><strong>Clinical reasoning:</strong> ${escape(alternative.why || alternative.explanation || "")}</p></article>`).join("")}</div></section>` : ""}`;

  const caseLabAnalysis = (item) => `<section class="reveal-section"><p class="eyebrow">Analysis of all four clinical moves</p><div class="alternatives case-analysis">${(item.choices || []).map((choice) => `<article class="alternative"><h3>${escape(choice.label)} · ${escape(choice.title || "Clinical option")}</h3><blockquote>“${escape(choice.response)}”</blockquote>${choice.accomplishes ? `<p><strong>What it accomplishes:</strong> ${escape(choice.accomplishes)}</p>` : ""}${choice.helpful ? `<p><strong>What may be helpful:</strong> ${escape(choice.helpful)}</p>` : ""}${choice.overlooks ? `<p><strong>What it might overlook:</strong> ${escape(choice.overlooks)}</p>` : ""}${choice.risks ? `<p><strong>Potential risks or limitations:</strong> ${escape(choice.risks)}</p>` : ""}${choice.appropriate ? `<p><strong>When it could fit:</strong> ${escape(choice.appropriate)}</p>` : ""}</article>`).join("")}</div>${item.preferredStartingPoint ? `<div class="preferred-start"><strong>Preferred starting point in this scenario:</strong> ${escape(item.preferredStartingPoint)}<br><small>The other responses are not universally wrong; fit depends on context, timing, and the therapeutic relationship.</small></div>` : ""}</section>`;

  const renderReveal = (item, attempt, attemptId) => {
    root.querySelector(".moment")?.remove();
    const responseCheck = item.type === "The Clinical Response Check";
    const selectedOne = item.choices?.find((choice) => choice.label === attempt.selectedOption);
    const roundTwoSelected = item.roundTwoChoices?.find((choice) => choice.label === attempt.roundTwoSelectedOption);
    const thinking = responseCheck ? attempt.response : `${attempt.selectedOption} · ${selectedOne?.response || ""}${attempt.rationale ? ` — ${attempt.rationale}` : ""}`;
    const roundTwoThinking = attempt.roundTwoResponse || (attempt.roundTwoSelectedOption ? `${attempt.roundTwoSelectedOption} · ${roundTwoSelected?.response || ""}${attempt.roundTwoRationale ? ` — ${attempt.roundTwoRationale}` : ""}` : "");
    root.insertAdjacentHTML("beforeend", `<div class="reveal" data-reveal tabindex="-1">
      <section class="reveal-section"><p class="eyebrow">${responseCheck ? "Your clinical thinking" : "Your clinical decision"}</p><div class="your-thinking"><p>${escape(thinking)}</p><small>There is no pass/fail here. Compare your thinking with the clinical considerations below.</small></div>${roundTwoThinking ? `<div class="your-thinking round-two-thinking"><p class="eyebrow">Your Round Two response</p><p>${escape(roundTwoThinking)}</p></div>` : ""}</section>
      ${responseCheck ? responseCheckAnalysis(item) : caseLabAnalysis(item)}
      ${item.roundTwoEnabled && item.roundTwoBreakdown ? `<section class="reveal-section"><p class="eyebrow">Round Two clinical reasoning</p><h2>What the new information invites us to consider</h2><p>${escape(item.roundTwoBreakdown)}</p>${item.whatChangedBetweenDecisions ? `<div class="intention-note"><h3>What changed between the two decisions</h3><p>${escape(item.whatChangedBetweenDecisions)}</p></div>` : ""}</section>` : ""}
      <section class="reveal-section lesson"><p class="eyebrow">The bigger clinical lesson</p><h2>${escape(item.biggerLesson || "Clinical responses are context-dependent.")}</h2>${item.practicalApplication ? `<p><strong>Try this in your next session:</strong> ${escape(item.practicalApplication)}</p>` : ""}${item.nuance ? `<p><strong>Important clinical nuance:</strong> ${escape(item.nuance)}</p>` : ""}</section>
      ${item.reflectionPrompts?.length ? `<section class="reveal-section"><p class="eyebrow">Reflection questions</p><ul>${item.reflectionPrompts.map((question) => `<li>${escape(question)}</li>`).join("")}</ul><div class="reflection-actions"><button class="button" type="button" data-copy>Copy Reflection Questions</button><button class="button" type="button" data-retry>Try as a new attempt</button></div></section>` : ""}
      <section class="signup-card"><p class="eyebrow">Keep practicing with us</p><h2>One clinical challenge down. Ready for the next?</h2><p>Get notified when new practice opportunities drop, or join the community for clinical discussions and community-only challenges.</p><form data-signup-form><div class="signup-fields"><label>First name<input name="firstName" autocomplete="given-name" required></label><label>Email address<input name="email" type="email" autocomplete="email" required></label></div><label class="consent-row"><input name="consent" type="checkbox" required> <span>Yes, email me new clinical challenges, resources, and occasional training offers.</span></label><button class="button" type="submit">Notify Me</button><p class="status" data-signup-status>You can unsubscribe anytime. See our <a href="/privacy">Privacy Policy</a>.</p></form></section>
      <aside class="community-band"><p class="eyebrow">Practice with others</p><h2>Join The Confident Clinician Community.</h2><p>Discuss clinical decisions and strengthen your skills alongside other clinicians.</p><a class="button" data-skool-cta href="https://www.skool.com/the-confident-clinician-1929/about" target="_blank" rel="noopener">Join the Community</a></aside>
      <p class="privacy-note">For educational purposes only. Scenarios are fictional or composites and are not a substitute for clinical supervision, individualized assessment, or professional judgment.</p>
    </div>`);
    const reveal = root.querySelector("[data-reveal]");
    reveal.focus();
    reveal.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    root.querySelector("[data-copy]")?.addEventListener("click", async (event) => { await navigator.clipboard.writeText(item.reflectionPrompts.join("\n\n")); event.currentTarget.textContent = "Copied"; });
    root.querySelector("[data-retry]")?.addEventListener("click", () => location.reload());
    const signup = root.querySelector("[data-signup-form]");
    signup?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = signup.querySelector("[data-signup-status]");
      const button = signup.querySelector("button");
      const form = new FormData(signup);
      button.disabled = true;
      message.textContent = "Adding you…";
      try {
        const response = await fetch(`${publicApi}?action=signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: form.get("firstName"), email: form.get("email"), consent: form.get("consent") === "on", attemptId, exerciseId: item.exerciseId, sessionId, source, campaign, keyword, triggerType, referralToken }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        signup.innerHTML = `<div class="signup-success"><h3>${escape(data.message)}</h3><p>You can unsubscribe anytime using the link in any email.</p></div>`;
        window.tccTrack?.("practice_email_opt_in", { exercise_slug: slug, source, campaign });
      } catch (error) { message.textContent = error.message; button.disabled = false; }
    });
    root.querySelector("[data-skool-cta]")?.addEventListener("click", () => {
      fetch(`${publicApi}?action=track`, { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventType: "Skool CTA Click", exerciseId: item.exerciseId, attemptId, sessionId, source, campaign, keyword, triggerType, referralToken }) });
    });
  };

  const load = previewId
    ? fetch(`${adminApi}?action=preview-exercise&id=${encodeURIComponent(previewId)}`, { credentials: "same-origin" })
    : fetch(`${publicApi}?action=exercise&slug=${encodeURIComponent(slug)}`);

  load.then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); exercise = data.exercise; status.textContent = previewId ? "Admin preview · no participant data will be saved." : ""; prompt(); if (!previewId) { window.tccTrack?.("practice_exercise_view", { exercise_slug: slug, source }); if (!sessionStorage.getItem(`tccExerciseView:${slug}`)) { sessionStorage.setItem(`tccExerciseView:${slug}`, "1"); fetch(`${publicApi}?action=track`, { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventType: "Exercise View", exerciseId: exercise.exerciseId, sessionId, source, campaign, keyword, triggerType, page: slug, referrer: document.referrer, referralToken }) }); } } }).catch((error) => { status.textContent = error.message || "That exercise could not load."; });
})();
