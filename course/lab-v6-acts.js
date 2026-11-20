/* Clinical Confidence Lab v6: one practice activity per Week 1 lesson.
   Built from each lesson script's in-video exercise and examples, made harder: mixed signals, self-diagnoses that
   don't match the evidence, context that changes the answer, and moments where the tool isn't enough.
   Script-sourced lines: the four-gap descriptions and the "twelve minutes about their week" example (L1); cue lists,
   "I think you don't understand me either", the silence guidance and "not every urge is avoidance" (L2);
   "I don't even know what I feel anymore", the "I feel like I mess everything up" comparison, "Don't try to make me
   feel better", and "safety takes priority over P.A.U.S.E." (L3). Therapist vignettes, prompts and feedback are
   DRAFT wording awaiting Tiffany's clinical review. All people are fictional.
   `ai` on a screen = a builder note showing where AI could come in later (shown on the preview only). */
(function () {
  const GAP = { knowledge: "Knowledge", skill: "Skill", pressure: "Pressure", support: "Support" };

  const l1 = {
    key: "l1", name: "Name the Gap", look: "gap",
    teaser: "Four therapists, four self-diagnoses. Read the evidence, find the real gap, build the right plan, then do it for yourself.",
    screens: [
      { kind: "intro", title: "Feeling lost isn’t one problem.",
        text: "It’s usually one of four, and more than one can be true. The hard part: what therapists say is wrong often isn’t what the evidence shows.",
        cards: [["Knowledge", "I don’t know it yet.", "Study, verify, consult."], ["Skill", "I know it, but I can’t do it live yet.", "Practice the actual behavior."], ["Pressure", "I can do it, but pressure changes how I perform.", "Notice the cue, slow down."], ["Support", "This needs more than me trying harder.", "Supervision, consultation, referral."]] },
      { kind: "tag", title: "What’s the real gap?",
        moment: { who: "Same moment, four therapists", line: "A client spends twelve minutes walking through their week, and you can’t connect any of it to the treatment goals." },
        text: "Each therapist says what they think went wrong. Look past their label to the evidence. What’s the main gap?",
        options: Object.entries(GAP),
        items: [
          ["ana", "“I think I need another training on case conceptualization. Although in role-play last week I tied a whole week back to the goals, no problem. With her, I didn’t redirect. Last time I did, she teared up.”", "pressure", "Ana calls it knowledge, but she already did it in role-play. What changed was this client and the fear of upsetting her.", "Ana"],
          ["chris", "“I’m just bad under pressure. I froze. Honestly, I’ve never really learned how to pull themes out of a client’s stories. I usually just follow along and hope something stands out.”", "knowledge", "Chris calls it pressure, but he’s never learned how to find themes. No amount of calm fixes a method you don’t have yet.", "Chris"],
          ["jules", "“I saw the theme. Everything was about feeling taken for granted. But when I tried to say it, it turned into a three-minute recap and the session moved on before I got to a question.”", "skill", "Jules knew the pattern. The summary is what fell apart, and that gets better with timed practice out loud.", "Jules"],
          ["rae", "“Somewhere in there she mentioned she’s barely eaten in two weeks. I kept going. I didn’t want to derail her, and I wasn’t sure if that was even my lane.”", "support", "Pressure may be in there too, but a possible health or safety issue Rae isn’t sure how to handle comes first. That calls for assessment and consultation, not trying harder alone.", "Rae"]
        ] },
      { kind: "tag", title: "Build their 30-minute plan.",
        text: "You have 30 minutes to help each of them. Which plan actually fits their gap? They all sound useful.",
        legend: true,
        options: [["roleplay", "Peer role-play", "Role-play redirecting with a peer who plays a client who tears up."], ["framework", "Learn a method", "Learn a theme-finding method, then map one fictional case with it."], ["timed", "Timed summaries", "Practice three 30-second summaries out loud, each ending in a question."], ["consult", "Call a supervisor", "Talk with a supervisor before the next session about what to assess."]],
        items: [
          ["ana", "Their gap: Pressure", "roleplay", "She can already do it. She needs reps under the exact condition that throws her: a client who might get upset.", "Ana"],
          ["chris", "Their gap: Knowledge", "framework", "A role-play would just rehearse following along. He needs the method first.", "Chris"],
          ["jules", "Their gap: Skill", "timed", "Jules doesn’t need more theory. She needs the behavior: short, out loud, ending in a question.", "Jules"],
          ["rae", "Their gap: Support", "consult", "This shouldn’t wait for practice. It needs a conversation with someone who can help her assess it.", "Rae"]
        ] },
      { kind: "multi", title: "Change one detail.",
        moment: { who: "Ana, two weeks later", line: "It happened again. And this time she mentioned a diagnosis from her psychiatrist that I’d never heard of. I nodded like I knew it." },
        text: "Which gaps are in play now? Pick all that fit.",
        options: Object.entries(GAP), correct: ["pressure", "knowledge"],
        fb: "Pressure is still there: she nodded to look like she knew. But now there’s a knowledge gap too: she needs to look up the diagnosis and check it with someone. More than one gap can be true at once. The point is the next responsible action, not one perfect label." },
      { kind: "own", title: "Your turn.",
        text: "Think of one recent moment. No client details. Describe what you did, not how you felt.",
        fields: [
          ["what", "What happened, as a behavior", "I moved to reassurance before clarifying what the client meant."],
          ["action", "One thing you’ll do this week", ""]
        ],
        gapActions: { knowledge: "Name what to study and where you’ll check it.", skill: "Pick one response to rehearse three times.", pressure: "Name one body cue and one grounding action.", support: "Decide who to consult or what procedure to follow." },
        example: "“When the client asked for advice, I stopped exploring their values and started telling them what to do.” Gap: Pressure. Action: practice two collaborative questions out loud and ask my supervisor for feedback on whether I leave room for their choice." },
      { kind: "selfcheck", title: "Is your plan real?",
        text: "Most plans fail because they’re too vague to do. Test yours.",
        checks: ["Could someone else tell whether you did it?", "Does it say when, or how many times?", "Does it fit your gap, not just sound helpful?"],
        ai: "AI could read your action and push back with one question if it’s too vague to do this week." },
      { kind: "summary", title: "Your gap, named." }
    ]
  };

  const l2 = {
    key: "l2", name: "Catch the Reaction", look: "freeze",
    teaser: "Freeze a hard moment, sort pressure from good judgment, then respond and read three silences that each need something different.",
    screens: [
      { kind: "intro", title: "Your reactions aren’t random.",
        text: "Pressure shows up in three ways. But not every urge is pressure. Sometimes leaning in or asking directly is exactly right. This activity practices telling the difference.",
        cards: [["Physical", "Held breath, tight jaw, faster heartbeat, leaning forward."], ["Mental", "“I have to fix this.” “I should know this.” “I’m losing them.”"], ["Behavioral", "Too many questions, explaining, reassuring, changing the topic."]] },
      { kind: "freeze", title: "Freeze the moment.",
        moment: { who: "Session 6 · client", ctx: "Last week you suggested a thought record. They didn’t do it. Now they cross their arms:", line: "Honestly? I think you don’t understand me either. Everyone just keeps giving me homework." },
        text: "Before you say anything, what happens in you? If this one doesn’t get to you, say so. That counts too.",
        rows: [
          ["thought", "First thought", ["I’m losing them", "I should have known", "They’re being unfair", "I need to fix this", "Nothing, I felt steady"]],
          ["urge", "What you’re tempted to do", ["Explain why I gave it", "Apologize a lot", "Drop the homework fast", "Ask lots of questions", "No strong urge"]],
          ["body", "Where you feel it", ["Held breath", "Tight jaw", "Face gets warm", "Leaning back", "Somewhere else", "I didn’t feel it"]]
        ] },
      { kind: "tag", title: "Pressure, or a good call?",
        text: "Not every urge to act is avoidance. For each moment, is the therapist’s move pressure talking, or a clinical choice?",
        options: [["pressure", "Pressure talking"], ["choice", "A clinical choice"], ["either", "Could be either"]],
        items: [
          ["q3", "The client pauses mid-thought. The therapist asks a third question before the first one is answered.", "pressure", "Stacking questions usually fills your discomfort, not their need. Let the first one land."],
          ["direct", "The client mentions they’ve been thinking about not being around anymore. The therapist asks a direct question about it right away.", "choice", "This is the right urge. Possible risk means you ask directly. Slowing down here would be the mistake."],
          ["lean", "The therapist leans forward as the client describes a big win at work.", "either", "Could be engagement, could be eagerness to move to good news. Context decides. The question is what it does for the client."],
          ["explain", "The client says the last suggestion was useless. The therapist explains the research behind it.", "pressure", "Explaining yourself right after criticism usually protects you, not them. Get curious about what didn’t fit first."]
        ] },
      { kind: "reset", title: "Pick your reset.",
        text: "A reset is one tiny move you make before you answer, so you respond on purpose instead of on autopilot. The client won’t notice it. Which would you use with the client who crossed their arms?",
        options: ["Plant my feet", "Slow my pace", "One breath", "Go back to their exact words"] },
      { kind: "write2", title: "Now say it.",
        moment: { who: "Client", line: "Honestly? I think you don’t understand me either. Everyone just keeps giving me homework." },
        text: "Say it the way you actually would in the room. Then hear how the client takes it.",
        fields: [["r1", "Your response", "What would you say?"]],
        example: "“I want to understand what I’ve missed. What have I been getting wrong?” Notice it doesn’t defend the homework or drop it. It asks.",
        ai: true },
      { kind: "reflect", title: "Check your response.",
        text: "Four questions from the lesson. Go with your gut.",
        show: "r1",
        items: [
          ["q1", "Could the client disagree with you without having to take care of your feelings?", [["Yes", "Then there’s room in the conversation for the client’s real reaction.", 1], ["Not quite", "Look for anything that explains, defends, or apologizes a lot. Each one makes it harder to push back.", 0], ["Not sure", "Read it out loud as the client, arms still crossed. Would you feel free to say “that’s not it either”?", 0]]],
          ["q2", "Did you respond to the client’s meaning, or mainly to your own discomfort?", [["Their meaning", "You stayed with what the client was telling you.", 1], ["Some of both", "Honest answer. Noticing the mix is what gives you a choice next time.", 0], ["My discomfort", "That’s useful to see. It’s the pressure talking, not a lack of skill.", 0]]],
          ["q3", "Did you ask a question you genuinely wanted answered?", [["Yes", "Real curiosity tends to land as real interest.", 1], ["Not really", "Questions we ask to fill space or steer often feel that way to clients.", 0], ["No question", "That can work too. The question is whether it left them room to keep going.", 1]]],
          ["q4", "Did you make room for the client to correct you?", [["Yes", "That room is what lets the client tell you what you missed.", 1], ["Not quite", "Something like checking your read, or asking what you got wrong, opens that door.", 0]]]
        ],
        revise: "Want to adjust your response?",
        closing: "We don’t need perfection here. We need enough awareness to create a little room for choice." },
      { kind: "tag", title: "Three silences.",
        text: "You asked a question and the client went quiet. Same length of silence, different context. What does each one need?",
        options: [["wait", "Wait"], ["check", "Gently check in"], ["clarify", "Clarify my question"]],
        items: [
          ["s1", "She usually thinks before she answers. Eyes down, calm. You’d just asked what she remembers about her dad.", "wait", "This silence looks chosen. Interrupting it could cut off something useful."],
          ["s2", "He glances at you, then away, twice. Your question had two parts and a long setup.", "clarify", "This looks like confusion, not processing. Your job becomes clarifying, not holding silence because silence is “therapeutic.”"],
          ["s3", "Her breathing speeds up and her eyes fill. She’d just started describing the accident.", "check", "Something is coming up. A gentle check-in makes room without pushing: “Take your time. What’s coming up right now?”"]
        ] },
      { kind: "summary", title: "Your reaction, caught." }
    ]
  };

  const l3 = {
    key: "l3", name: "Two Takes", look: "takes",
    teaser: "Answer a hard line on instinct, then with P.A.U.S.E. Compare, see what different responses invite, and learn when the tool isn’t enough.",
    screens: [
      { kind: "intro", title: "Your brain gives you nothing. Now what?",
        text: "P.A.U.S.E. isn’t a perfect line. It’s a way back into the conversation. And it has limits: when safety comes up, safety comes first.",
        pause: true },
      { kind: "take", n: 1, title: "Take 1: on instinct.",
        moment: { who: "Client · session 4", ctx: "She’s been describing a hard month. Then she stops and says flatly:", line: "I don’t even know what I feel anymore." },
        text: "Don’t overthink it. What would you say right now?" },
      { kind: "pausewalk", title: "Now run P.A.U.S.E.",
        moment: { who: "Client", line: "I don’t even know what I feel anymore." },
        steps: [["P", "Pause", "Slow down. What’s your urge right now?", "e.g. to name the feeling for her, to reassure"], ["A", "Attend", "What do you notice in her, and in you?", "e.g. flat voice, after a hard month"], ["U", "Use", "Which of her words will you use?", "e.g. “anymore”"]] },
      { kind: "take", n: 2, title: "Take 2: say one thing.",
        moment: { who: "Client", line: "I don’t even know what I feel anymore." },
        text: "S · Say: one intentional response. Then E · Explore: let her answer guide your next move." },
      { kind: "compare", title: "Side by side.",
        checks: ["Closer to her words?", "Leaves room to clarify?", "One clear purpose?"],
        ai: "AI could point out one specific difference between your two takes, like which of her words Take 2 used." },
      { kind: "tag", title: "What does each one invite?",
        moment: { who: "A different client", line: "I feel like I mess everything up." },
        text: "Three therapists, three responses. None is “wrong” forever. What does each one invite right now?",
        options: [["argue", "Argues with the feeling"], ["technique", "Jumps to a technique"], ["opens", "Opens the experience"]],
        items: [
          ["r1", "“That’s not true. You’ve done so many good things.”", "argue", "Kind in intent, but it can skip the experience behind the statement. She may feel corrected instead of heard."],
          ["r2", "“What evidence supports that thought?”", "technique", "Could fit later. Right now you don’t know what happened yet. Timing matters."],
          ["r3", "“What happened that left you feeling that way?”", "opens", "Explore before explaining. You learn what she’s actually describing before deciding what to do with it."]
        ] },
      { kind: "take", n: 3, title: "She pushes back.",
        moment: { who: "Client", line: "Don’t try to make me feel better. I just need to say how bad it feels." },
        text: "Take 3, in your normal voice. Make room for the feeling instead of arguing with it.",
        ai: "AI could play the client and respond to your Take 3." },
      { kind: "pick", title: "When the tool isn’t enough.",
        moment: { who: "Client, quietly", line: "Some days I think everyone would be better off without me." },
        text: "What’s your priority now?",
        options: [
          ["explore", "Keep exploring the feeling with P.A.U.S.E.", "P.A.U.S.E. doesn’t mean spending ten minutes exploring while possible risk sits there. This line changes the priority."],
          ["safety", "Ask directly and caringly about safety, then follow your assessment and protocol", "Yes. When safety information appears, ordinary exploration stops and your assessment and protocol responsibilities come first. No framework overrides that."],
          ["reflect", "Reflect it back and wait", "Reflecting can feel attuned, but waiting leaves possible risk unassessed. Ask directly."]
        ], best: "safety" },
      { kind: "summary", title: "Three takes, one tool, one limit." }
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
