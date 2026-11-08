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
  const RESPONSE_CHECK = "The Clinical Response Check";
  const escape = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
  const unquote = (text = "") => String(text).trim().replace(/^["“”']+|["“”']+$/g, "");
  const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  let exercise;
  let roundOneAttempt = {};
  let sessionId = localStorage.getItem("tccPracticeSession");
  if (!sessionId) { sessionId = crypto.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`; localStorage.setItem("tccPracticeSession", sessionId); }

  const disclosure = () => exercise.saveFreeTextResponses
    ? '<p class="px-note">Your written response is saved to support review and future teaching. Don’t include names or identifying client information.</p>'
    : '<p class="px-note">Don’t include names or identifying client information.</p>';

  const typeTag = (item) => item.type === RESPONSE_CHECK
    ? '<span class="px-tag px-tag-response">Response Check</span>'
    : '<span class="px-tag px-tag-case">Case Lab</span>';

  const choiceMarkup = (choices, name = "choice", labelledBy = "") => `<div class="px-options" role="radiogroup"${labelledBy ? ` aria-labelledby="${labelledBy}"` : ""}>${(choices || []).map((choice) => `<label class="px-option"><input type="radio" name="${name}" value="${escape(choice.label)}"><span class="px-option-letter" aria-hidden="true">${escape(choice.label)}</span><span class="px-option-text">${escape(choice.response)}</span></label>`).join("")}</div>`;

  const quoteBlock = (label, text, variant = "client") => `<figure class="px-turn px-turn-${variant}"><figcaption>${label}</figcaption><blockquote>“${escape(unquote(text))}”</blockquote></figure>`;

  const prompt = () => {
    const responseCheck = exercise.type === RESPONSE_CHECK;
    document.title = `${exercise.title} | The Confident Clinician`;
    const meta = [exercise.category, exercise.readingTime, exercise.roundTwoEnabled ? "Two rounds" : ""].filter(Boolean).map((text) => `<span>${escape(text)}</span>`).join("");
    root.innerHTML = `<header class="px-head">
        <div class="px-tags">${typeTag(exercise)}${meta ? `<span class="px-meta">${meta}</span>` : ""}</div>
        <h1>${escape(exercise.title)}</h1>
      </header>
      <section class="px-stage" data-stage>
        <div class="px-moment">
          ${responseCheck
            ? `${quoteBlock("Client", exercise.clientStatement)}${quoteBlock("Therapist", exercise.therapistResponse, "therapist")}`
            : `<p class="px-scenario">${escape(exercise.caseScenario)}</p>${exercise.clientStatement ? quoteBlock("Client", exercise.clientStatement) : ""}`}
        </div>
        <form class="px-decide" data-attempt-form>
          ${responseCheck
            ? `<label class="px-question" for="thinking">${escape(exercise.reflectionQuestion || "What stands out to you clinically?")}</label><textarea class="px-text" id="thinking" name="response" minlength="12" required placeholder="I notice that…"></textarea>`
            : `<p class="px-question" id="px-q">${escape(exercise.reflectionQuestion || "What would you say next?")}</p>${choiceMarkup(exercise.choices, "choice", "px-q")}<label class="px-sr" for="rationale">Why did you choose this response? (optional)</label><textarea class="px-text px-text-short" id="rationale" name="rationale" placeholder="Why this one? (optional)"></textarea>`}
          ${exercise.hint ? `<details class="px-hint"><summary>Need a thinking prompt?</summary><p>${escape(exercise.hint)}</p></details>` : ""}
          ${disclosure()}
          <div class="px-submit"><button class="px-btn px-btn-rust" type="submit" disabled>${exercise.roundTwoEnabled ? "Submit and continue" : "See the breakdown"}</button><span class="px-status" data-submit-status role="status"></span></div>
        </form>
      </section>`;
    const form = root.querySelector("[data-attempt-form]");
    const button = form.querySelector("button[type=submit]");
    const update = () => { button.disabled = responseCheck ? form.response.value.trim().length < 12 : !form.querySelector('input[name="choice"]:checked'); };
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    form.addEventListener("submit", submitRoundOne);
    // A move picked on the library page arrives as ?choice=C, so the learner isn't asked twice.
    const preset = params.get("choice");
    if (!responseCheck && preset) {
      const input = [...form.querySelectorAll('input[name="choice"]')].find((item) => item.value === preset);
      if (input) { input.checked = true; update(); }
    }
  };

  const submitRoundOne = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type=submit]");
    const message = form.querySelector("[data-submit-status]");
    const selected = form.querySelector('input[name="choice"]:checked')?.value || "";
    roundOneAttempt = { response: form.response?.value || "", selectedOption: selected, rationale: form.rationale?.value || "" };
    button.disabled = true;
    message.textContent = exercise.roundTwoEnabled ? "Opening the next moment…" : "Preparing the breakdown…";
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
    } catch (error) { message.textContent = error.message || "That didn’t go through. Please try again."; button.disabled = false; }
  };

  const yourMove = (label, text) => `<div class="px-yours"><span class="px-yours-label">${label}</span><p>${text}</p></div>`;

  const roundOneSummary = () => {
    const choice = exercise.choices?.find((item) => item.label === roundOneAttempt.selectedOption);
    return choice ? `<strong>${escape(choice.label)}.</strong> ${escape(choice.response)}` : escape(roundOneAttempt.response || "");
  };

  const renderRoundTwo = (token, roundTwo = exercise) => {
    const format = roundTwo.answerFormat || exercise.roundTwoAnswerFormat || "Free text";
    const choices = roundTwo.choices || exercise.roundTwoChoices || [];
    root.querySelector("[data-stage]")?.remove();
    root.insertAdjacentHTML("beforeend", `<section class="px-stage px-round-two" data-stage tabindex="-1" aria-labelledby="px-r2-title">
      <div class="px-moment">
        <p class="px-eyebrow" id="px-r2-title">Round two</p>
        ${yourMove("Your first move", roundOneSummary())}
        ${quoteBlock("Client responds", roundTwo.clientResponse || exercise.roundTwoClientResponse)}
      </div>
      <form class="px-decide" data-round-two-form>
        ${format === "Multiple choice"
          ? `<p class="px-question" id="px-q2">${escape(roundTwo.question || exercise.roundTwoQuestion || "What would you do next?")}</p>${choiceMarkup(choices, "roundTwoChoice", "px-q2")}<label class="px-sr" for="round-two-thinking">Why did you choose this response? (optional)</label><textarea class="px-text px-text-short" id="round-two-thinking" name="roundTwoRationale" placeholder="Why this one? (optional)"></textarea>`
          : `<label class="px-question" for="round-two-thinking">${escape(roundTwo.question || exercise.roundTwoQuestion || "What would you do next?")}</label><textarea class="px-text" id="round-two-thinking" name="roundTwoResponse" minlength="12" required placeholder="I might say or explore…"></textarea>`}
        ${disclosure()}
        <div class="px-submit"><button class="px-btn px-btn-rust" type="submit" disabled>See the breakdown</button><span class="px-status" data-submit-status role="status"></span></div>
      </form>
    </section>`);
    const stage = root.querySelector("[data-stage]");
    const form = root.querySelector("[data-round-two-form]");
    const button = form.querySelector("button[type=submit]");
    const update = () => { button.disabled = format === "Multiple choice" ? !form.querySelector('input[name="roundTwoChoice"]:checked') : form.roundTwoResponse.value.trim().length < 12; };
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const selected = form.querySelector('input[name="roundTwoChoice"]:checked')?.value || "";
      const roundTwoAttempt = { roundTwoResponse: form.roundTwoResponse?.value || "", roundTwoSelectedOption: selected, roundTwoRationale: form.roundTwoRationale?.value || "" };
      const message = form.querySelector("[data-submit-status]");
      button.disabled = true;
      message.textContent = "Preparing the breakdown…";
      if (previewId) { completeReveal(exercise, "preview-attempt", roundTwoAttempt); return; }
      try {
        const response = await fetch(`${publicApi}?action=submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, roundTwoToken: token, ...roundTwoAttempt, rationale: roundOneAttempt.rationale, sessionId, source, campaign, keyword, triggerType, referralToken, referrer: document.referrer }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        completeReveal(data.exercise, data.attemptId, roundTwoAttempt);
      } catch (error) { message.textContent = error.message || "That didn’t go through. Please try again."; button.disabled = false; }
    });
    stage.focus({ preventScroll: true });
    stage.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
  };

  const completeReveal = (item, attemptId, roundTwoAttempt = {}) => {
    renderReveal(item, { ...roundOneAttempt, ...roundTwoAttempt }, attemptId);
    if (!previewId) {
      window.tccTrack?.("practice_breakdown_reveal", { exercise_slug: slug, exercise_type: exercise.type, source, campaign });
      window.tccTrack?.("practice_exercise_completed", { exercise_slug: slug, exercise_type: exercise.type, source });
    }
  };

  const stepsOrText = (text = "") => {
    const parts = String(text).split(/\s*\b\d\)\s+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 3 && /\b1\)\s/.test(text)) {
      const [intro, ...steps] = /^\s*1\)/.test(text) ? ["", ...parts] : parts;
      return `${intro ? `<p>${escape(intro)}</p>` : ""}<ol class="px-steps">${steps.map((step) => `<li>${escape(step)}</li>`).join("")}</ol>`;
    }
    return `<p>${escape(text)}</p>`;
  };

  const facet = (label, text) => text ? `<div class="px-facet"><h4>${label}</h4><p>${escape(text)}</p></div>` : "";

  const caseLabAnalysis = (item, selectedLabel) => {
    const choices = item.choices || [];
    if (!choices.length) return "";
    const start = choices.some((choice) => choice.label === selectedLabel) ? selectedLabel : choices[0].label;
    return `<section class="px-section" aria-labelledby="px-moves-title">
      <h2 id="px-moves-title">How each move plays out</h2>
      <div class="px-tabs" role="tablist" aria-label="Clinical moves">${choices.map((choice) => {
        const on = choice.label === start;
        return `<button type="button" role="tab" id="px-tab-${escape(choice.label)}" aria-controls="px-panel-${escape(choice.label)}" aria-selected="${on}" tabindex="${on ? 0 : -1}"><span class="px-tab-letter">${escape(choice.label)}</span><span class="px-tab-title">${escape(choice.title || `Option ${choice.label}`)}</span>${choice.label === selectedLabel ? '<span class="px-tab-yours">Your choice</span>' : ""}</button>`;
      }).join("")}</div>
      ${choices.map((choice) => `<div class="px-panel" role="tabpanel" id="px-panel-${escape(choice.label)}" aria-labelledby="px-tab-${escape(choice.label)}" tabindex="0" ${choice.label === start ? "" : "hidden"}>
        <blockquote class="px-panel-quote">“${escape(unquote(choice.response))}”</blockquote>
        <div class="px-facets">${facet("What it accomplishes", choice.accomplishes)}${facet("What may help", choice.helpful)}${facet("What it might overlook", choice.overlooks)}${facet("Risks or limits", choice.risks)}${facet("When it could fit", choice.appropriate)}</div>
      </div>`).join("")}
      ${item.preferredStartingPoint ? `<div class="px-callout"><h3>Preferred starting point here</h3><p>${escape(item.preferredStartingPoint)}</p><p class="px-callout-note">The other moves aren’t wrong. Fit depends on context, timing, and the relationship.</p></div>` : ""}
    </section>`;
  };

  const responseCheckAnalysis = (item) => `
    ${item.clinicalConsideration || item.clinicalConsiderationExplanation || item.therapistIntention ? `<section class="px-section px-consideration">
      ${item.clinicalConsideration ? `<p class="px-eyebrow">The clinical consideration</p><h2>${escape(item.clinicalConsideration)}</h2>` : ""}
      ${item.clinicalConsiderationExplanation ? `<p class="px-lead">${escape(item.clinicalConsiderationExplanation)}</p>` : ""}
      ${item.therapistIntention ? `<div class="px-aside"><h3>What the therapist was trying to do</h3><p>${escape(item.therapistIntention)}</p></div>` : ""}
    </section>` : ""}
    ${item.clinicalPoints?.length ? `<section class="px-section" aria-labelledby="px-missing"><h2 id="px-missing">What might be missing</h2><div class="px-grid">${item.clinicalPoints.map((point) => `<article class="px-point"><h3>${escape(point.title)}</h3><p>${escape(point.body)}</p>${point.implication ? `<p class="px-implication">${escape(point.implication)}</p>` : ""}</article>`).join("")}</div></section>` : ""}
    ${item.alternatives?.length ? `<section class="px-section" aria-labelledby="px-alts"><h2 id="px-alts">Other ways to respond</h2><div class="px-grid">${item.alternatives.map((alternative) => `<article class="px-point px-alt"><h3>${escape(alternative.title || `Option ${alternative.label}`)}</h3><blockquote>“${escape(unquote(alternative.response))}”</blockquote><p>${escape(alternative.why || alternative.explanation || "")}</p></article>`).join("")}</div></section>` : ""}`;

  const wireTabs = () => {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    if (!tabs.length) return;
    const select = (tab, focus) => {
      tabs.forEach((other) => {
        const on = other === tab;
        other.setAttribute("aria-selected", String(on));
        other.tabIndex = on ? 0 : -1;
        document.getElementById(other.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => select(tab, false));
      tab.addEventListener("keydown", (event) => {
        const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        if (event.key in keys) { event.preventDefault(); select(tabs[(index + keys[event.key] + tabs.length) % tabs.length], true); }
        if (event.key === "Home") { event.preventDefault(); select(tabs[0], true); }
        if (event.key === "End") { event.preventDefault(); select(tabs[tabs.length - 1], true); }
      });
    });
  };

  const renderReveal = (item, attempt, attemptId) => {
    root.querySelector("[data-stage]")?.remove();
    const responseCheck = item.type === RESPONSE_CHECK;
    const selectedOne = item.choices?.find((choice) => choice.label === attempt.selectedOption);
    const roundTwoSelected = item.roundTwoChoices?.find((choice) => choice.label === attempt.roundTwoSelectedOption);
    const thinking = responseCheck
      ? escape(attempt.response)
      : `${selectedOne ? `<strong>${escape(selectedOne.label)} · ${escape(selectedOne.title || "")}</strong><br>“${escape(unquote(selectedOne.response))}”` : escape(attempt.selectedOption)}${attempt.rationale ? `<span class="px-rationale">${escape(attempt.rationale)}</span>` : ""}`;
    const roundTwoThinking = attempt.roundTwoResponse
      ? escape(attempt.roundTwoResponse)
      : (attempt.roundTwoSelectedOption ? `<strong>${escape(attempt.roundTwoSelectedOption)}.</strong> ${escape(roundTwoSelected?.response || "")}${attempt.roundTwoRationale ? `<span class="px-rationale">${escape(attempt.roundTwoRationale)}</span>` : ""}` : "");
    root.insertAdjacentHTML("beforeend", `<div class="px-reveal" data-reveal tabindex="-1">
      <section class="px-section px-yours-wrap" aria-label="Your answer">
        ${yourMove(responseCheck ? "What you noticed" : "Your move", thinking)}
        ${roundTwoThinking ? yourMove("Your round two response", roundTwoThinking) : ""}
      </section>
      ${responseCheck ? responseCheckAnalysis(item) : caseLabAnalysis(item, attempt.selectedOption)}
      ${item.roundTwoEnabled && item.roundTwoBreakdown ? `<section class="px-section" aria-labelledby="px-r2b"><h2 id="px-r2b">What the new information changes</h2><p class="px-lead">${escape(item.roundTwoBreakdown)}</p>${item.whatChangedBetweenDecisions ? `<div class="px-aside"><h3>Between your two decisions</h3><p>${escape(item.whatChangedBetweenDecisions)}</p></div>` : ""}</section>` : ""}
      ${item.biggerLesson || item.practicalApplication || item.nuance ? `<section class="px-lesson" aria-labelledby="px-lesson-title">
        <p class="px-eyebrow" id="px-lesson-title">The bigger clinical lesson</p>
        ${item.biggerLesson ? `<p class="px-lesson-text">${escape(item.biggerLesson)}</p>` : ""}
        <div class="px-lesson-cols">
          ${item.practicalApplication ? `<div><h3>Try this in your next session</h3>${stepsOrText(item.practicalApplication)}</div>` : ""}
          ${item.nuance ? `<div><h3>Clinical nuance</h3><p>${escape(item.nuance)}</p></div>` : ""}
        </div>
      </section>` : ""}
      ${item.reflectionPrompts?.length ? `<section class="px-section px-reflect" aria-labelledby="px-reflect-title"><h2 id="px-reflect-title">Questions to sit with</h2><ol>${item.reflectionPrompts.map((question) => `<li>${escape(question)}</li>`).join("")}</ol><div class="px-actions"><button class="px-btn px-btn-line" type="button" data-copy>Copy questions</button><button class="px-btn px-btn-line" type="button" data-retry>Try it again</button></div></section>` : ""}
      <section class="px-keep" aria-labelledby="px-keep-title">
        <div class="px-keep-text">
          <h2 id="px-keep-title">Get the next exercise by email</h2>
          <p>Or talk this one through in the <a data-skool-cta href="https://www.skool.com/the-confident-clinician-1929/about" target="_blank" rel="noopener">free community</a>.</p>
        </div>
        <form data-signup-form>
          <label><span class="px-sr">First name</span><input name="firstName" autocomplete="given-name" placeholder="First name" required></label>
          <label><span class="px-sr">Email address</span><input name="email" type="email" autocomplete="email" placeholder="Email address" required></label>
          <button class="px-btn px-btn-light" type="submit">Notify me</button>
          <label class="px-consent"><input name="consent" type="checkbox" required> <span>Email me new clinical challenges, resources, and occasional training offers.</span></label>
          <p class="px-form-status" data-signup-status>Unsubscribe anytime. <a href="/privacy">Privacy Policy</a></p>
        </form>
      </section>
      <p class="px-disclaimer">For educational purposes only. Scenarios are fictional or composites and are not a substitute for clinical supervision, individualized assessment, or professional judgment.</p>
    </div>`);
    const reveal = root.querySelector("[data-reveal]");
    wireTabs();
    reveal.focus({ preventScroll: true });
    reveal.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
    root.querySelector("[data-copy]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      try { await navigator.clipboard.writeText(item.reflectionPrompts.join("\n\n")); button.textContent = "Copied"; }
      catch { button.textContent = "Couldn’t copy. Select the text instead."; }
    });
    root.querySelector("[data-retry]")?.addEventListener("click", () => location.reload());
    const signup = root.querySelector("[data-signup-form]");
    signup?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = signup.querySelector("[data-signup-status]");
      const button = signup.querySelector("button[type=submit]");
      const form = new FormData(signup);
      button.disabled = true;
      message.textContent = "Adding you…";
      try {
        const response = await fetch(`${publicApi}?action=signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: form.get("firstName"), email: form.get("email"), consent: form.get("consent") === "on", attemptId, exerciseId: item.exerciseId, sessionId, source, campaign, keyword, triggerType, referralToken }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        signup.innerHTML = `<div class="px-signup-done"><h3>${escape(data.message)}</h3><p>You can unsubscribe anytime using the link in any email.</p></div>`;
        window.tccTrack?.("practice_email_opt_in", { exercise_slug: slug, source, campaign });
      } catch (error) { message.textContent = error.message || "That didn’t go through. Please try again."; button.disabled = false; }
    });
    root.querySelector("[data-skool-cta]")?.addEventListener("click", () => {
      fetch(`${publicApi}?action=track`, { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventType: "Skool CTA Click", exerciseId: item.exerciseId, attemptId, sessionId, source, campaign, keyword, triggerType, referralToken }) });
    });
  };

  const load = previewId
    ? fetch(`${adminApi}?action=preview-exercise&id=${encodeURIComponent(previewId)}`, { credentials: "same-origin" })
    : fetch(`${publicApi}?action=exercise&slug=${encodeURIComponent(slug)}`);

  load.then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); exercise = data.exercise; status.textContent = previewId ? "Admin preview · no participant data will be saved." : ""; prompt(); if (!previewId) { window.tccTrack?.("practice_exercise_view", { exercise_slug: slug, source }); if (!sessionStorage.getItem(`tccExerciseView:${slug}`)) { sessionStorage.setItem(`tccExerciseView:${slug}`, "1"); fetch(`${publicApi}?action=track`, { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventType: "Exercise View", exerciseId: exercise.exerciseId, sessionId, source, campaign, keyword, triggerType, page: slug, referrer: document.referrer, referralToken }) }); } } }).catch((error) => { status.textContent = error.message || "That exercise couldn’t load. Please refresh and try again."; });
})();
