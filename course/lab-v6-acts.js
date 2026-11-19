/* Clinical Confidence Lab v6: one practice activity per Week 1 lesson.
   Each activity is the in-video exercise from that lesson's script ("Try this with me…", "Let's actually try it…",
   "For the exercise…"), made interactive. Client lines and example answers are taken from the Week 1 lesson
   scripts. Screen prompts and feedback wording are DRAFT, awaiting Tiffany's clinical review.
   `ai` on a screen = a builder note showing where AI could come in later (shown on the preview only). */
(function () {
  const GAP = { knowledge: "Knowledge", skill: "Skill", pressure: "Pressure", support: "Support" };

  const l1 = {
    key: "l1", name: "Name the Gap", look: "gap",
    teaser: "Sort four therapists’ stuck moments into the right gap, match each gap to its next step, then name your own.",
    screens: [
      { kind: "intro", title: "Feeling lost isn’t one problem.",
        text: "It’s usually one of four. Each one needs a different next step. Here they are:",
        cards: [["Knowledge", "I don’t know it yet.", "Study, verify, consult."], ["Skill", "I know it, but I can’t do it live yet.", "Practice the actual behavior."], ["Pressure", "I can do it, but pressure gets in the way.", "Notice the cue, slow down."], ["Support", "This needs more than me trying harder.", "Supervision, consultation, referral."]] },
      { kind: "tag", title: "One moment. Four therapists.",
        moment: { who: "Client", line: "I’m having intrusive thoughts, and I’m scared of what they mean." },
        text: "Four therapists, same moment. Here’s what each said afterward. Which gap is it?",
        options: Object.entries(GAP),
        items: [
          ["a", "“I wasn’t sure what separates intrusive thoughts from something more serious, so I didn’t know what I was listening for.”", "knowledge", "The clue: they couldn’t name what to listen for. That’s something to learn or verify, not a confidence problem."],
          ["b", "“I knew what I wanted to find out. But every question came out sounding like ‘You’re not going to act on them, right?’”", "skill", "The clue: they knew the goal, but the wording kept slipping. That gets better with practice, not more reading."],
          ["c", "“On the drive home I knew exactly what I should have asked. In the room I just said, ‘That’s really common, try not to worry.’”", "pressure", "The clue: the answer showed up after the session. The knowledge didn’t appear when the client left. The conditions changed."],
          ["d", "“Some of what they described sounded like it could involve risk, and I’ve never assessed that on my own.”", "support", "The clue: possible risk they haven’t handled before. That’s a reason to consult, not to push through alone."]
        ] },
      { kind: "tag", title: "The colleague test.",
        text: "You have 30 minutes to help a colleague with each gap. What do you hand them?",
        options: [["read", "A chapter to read"], ["roleplay", "A role-play to practice"], ["reset", "A pressure reset"], ["consult", "Someone to consult"]],
        items: [
          ["knowledge", "Knowledge gap", "read", "Knowledge calls for study, consultation, or training."],
          ["skill", "Skill gap", "roleplay", "You don’t solve a skill gap with ten more PDFs. You practice the behavior."],
          ["pressure", "Pressure gap", "reset", "Notice the cue, slow down, practice under a little more pressure."],
          ["support", "Support gap", "consult", "Confidence includes knowing when you need help."]
        ] },
      { kind: "pick", title: "Change one detail.",
        moment: { who: "After a session", line: "I couldn’t help the client." },
        text: "Now say the client’s issue was outside your training. What’s the most responsible next step?",
        options: [
          ["confident", "Find a more confident-sounding intervention", "A more confident-sounding intervention isn’t the answer here."],
          ["consult", "Consult, get training, or refer", "Yes. When it’s outside your training, consulting, getting training, or referring is the clinically responsible move."],
          ["push", "Push through and try harder next time", "Trying harder can mean working outside your competence. This one is a support gap."]
        ], best: "consult" },
      { kind: "own", title: "Your turn.",
        text: "Think of one recent moment. No client details.",
        fields: [
          ["what", "What happened, as a behavior", "I moved to reassurance before clarifying what the client meant."],
          ["action", "One thing you can do this week", ""]
        ],
        gapActions: { knowledge: "Name what to study and where you’ll check it.", skill: "Pick one response to rehearse three times.", pressure: "Name one body cue and one grounding action.", support: "Decide who to consult or what procedure to follow." },
        example: "“When the client asked for advice, I stopped exploring their values and started telling them what to do.” Gap: Pressure. Action: practice two collaborative questions and get feedback.",
        ai: "AI could read your action and ask one follow-up if it isn’t specific enough to do this week." },
      { kind: "summary", title: "Your gap, named." }
    ]
  };

  const l2 = {
    key: "l2", name: "Catch the Reaction", look: "freeze",
    teaser: "Freeze one hard moment, catch what happens in you, pick a reset, then say it your way.",
    screens: [
      { kind: "intro", title: "Your reactions aren’t random.",
        text: "Pressure shows up in three ways. Catching it early gives you a choice.",
        cards: [["Physical", "Held breath, tight jaw, faster heartbeat, leaning forward."], ["Mental", "“I have to fix this.” “I should know this.” “I’m losing them.”"], ["Behavioral", "Too many questions, explaining, reassuring, changing the topic."]] },
      { kind: "freeze", title: "Freeze the moment.",
        moment: { who: "Client", line: "I think you don’t understand me either." },
        text: "Before you say anything, what happens in you?",
        rows: [
          ["thought", "First thought", ["I’m losing them", "I should know this", "I have to fix this", "They’re judging me"]],
          ["urge", "What you’re tempted to do", ["Explain myself", "Reassure them", "Ask lots of questions", "Change the topic"]],
          ["body", "Where you feel it", ["Held breath", "Tight jaw", "Faster heartbeat", "Leaning forward", "Not sure"]]
        ] },
      { kind: "reset", title: "Pick one small reset.",
        text: "Small enough that the client wouldn’t notice. It just buys you a beat.",
        options: ["Plant my feet", "Slow my pace", "One breath", "Go back to their exact words"] },
      { kind: "write2", title: "Now say it.",
        moment: { who: "Client", line: "I think you don’t understand me either." },
        fields: [["r1", "Your response", "What would you say?"], ["r2", "Now a second version that sounds more like you", "Same idea, your voice"]],
        example: "“I want to understand what I’ve missed. What have I been getting wrong?”",
        ai: "AI could play the client and react to what you actually wrote, instead of a scripted reply." },
      { kind: "check", title: "The test.",
        text: "Could the client disagree with you without having to take care of your feelings?",
        show: "r2",
        options: ["Yes", "Not quite", "Not sure"],
        fb: { "Yes": "That’s the goal. You stayed open even with tension in the room.", "Not quite": "Worth noticing. Try a version that makes it easier for them to correct you.", "Not sure": "Read it out loud as the client. Would you feel free to push back?" } },
      { kind: "pick", title: "One more moment.",
        moment: { who: "Client, after a long silence", line: "I don’t understand the question." },
        text: "You asked a question and they went quiet. Now they say this. What’s your job?",
        options: [
          ["wait", "Keep holding the silence", "Silence can help, but not here. They’ve told you they’re confused."],
          ["clarify", "Clarify the question", "Yes. Your job becomes clarification. Noticing your pressure gives you a choice. It doesn’t dictate one response."],
          ["reassure", "Reassure them it’s okay", "Kind, but they still don’t know what you asked."]
        ], best: "clarify" },
      { kind: "summary", title: "Your reaction, caught." }
    ]
  };

  const l3 = {
    key: "l3", name: "Two Takes", look: "takes",
    teaser: "Answer the same hard line twice: once off the top of your head, once with P.A.U.S.E. Then compare.",
    screens: [
      { kind: "intro", title: "Your brain gives you nothing. Now what?",
        text: "P.A.U.S.E. isn’t a perfect line. It’s a way back into the conversation. You’ll answer the same line twice and see the difference.",
        pause: true },
      { kind: "take", n: 1, title: "Take 1: off the top of your head.",
        moment: { who: "Client", line: "I don’t even know what I feel anymore." },
        text: "Don’t overthink it. What would you say right now?" },
      { kind: "pausewalk", title: "Now run P.A.U.S.E.",
        moment: { who: "Client", line: "I don’t even know what I feel anymore." },
        steps: [["P", "Pause", "Slow down. What’s the urge right now?", "e.g. to fix it, to name the feeling for them"], ["A", "Attend", "What do you notice in the client, and in you?", "e.g. they sound flat and tired"], ["U", "Use", "Which of their words will you use?", "e.g. “anymore”"]] },
      { kind: "take", n: 2, title: "Take 2: say one thing.",
        moment: { who: "Client", line: "I don’t even know what I feel anymore." },
        text: "S · Say: one intentional response. E · Explore comes next: let their answer guide you." },
      { kind: "compare", title: "Side by side.",
        checks: ["Closer to their words?", "Leaves room to clarify?", "One clear purpose?"],
        ai: "AI could point out one specific difference between your two takes, like which of the client’s words Take 2 used." },
      { kind: "take", n: 3, title: "They push back.",
        moment: { who: "Client", line: "Don’t try to make me feel better. I just need to say how bad it feels." },
        text: "Take 3, in your normal voice. Make room for the feeling instead of arguing with it.",
        ai: "AI could play the client and respond to your Take 3." },
      { kind: "summary", title: "Three takes, one tool." }
    ]
  };

  const demo = {
    moment: "Just tell me what to do. You’re the therapist. Should I break up with them?",
    hintWhy: "“Because it validates” isn’t enough. What does it help you learn, and what does it avoid?",
    check: "Did you give Jordan the decision back while still being helpful?",
    ai: "AI could reply to your “why” with one follow-up question."
  };

  window.TCC6_ACTS = { l1, l2, l3, demo, GAP };
})();
