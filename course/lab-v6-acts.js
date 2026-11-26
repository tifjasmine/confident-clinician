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
        text: "Think of one recent moment in session when you felt stuck, unsure, or lost. Leave out any client details. Write what you did in that moment, not how you felt.",
        fields: [
          ["what", "What you did in that moment", "I moved to reassurance before clarifying what the client meant."],
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
        text: "Three questions from the lesson. Go with your gut.",
        show: "r1",
        items: [
          ["q1", "Could the client disagree with you without having to take care of your feelings?", [["Yes", "Then there’s room in the conversation for the client’s real reaction.", 1], ["Not quite", "Look for anything that explains, defends, or apologizes a lot. Each one makes it harder to push back.", 0], ["Not sure", "Read it out loud as the client, arms still crossed. Would you feel free to say “that’s not it either”?", 0]]],
          ["q2", "Did you respond to the client’s meaning, or mainly to your own discomfort?", [["Their meaning", "You stayed with what the client was telling you.", 1], ["Some of both", "Honest answer. Noticing the mix is what gives you a choice next time.", 0], ["My discomfort", "That’s useful to see. It’s the pressure talking, not a lack of skill.", 0]]],
          ["q3", "Did you ask a question you genuinely wanted answered?", [["Yes", "Real curiosity tends to land as real interest.", 1], ["Not really", "Questions we ask to fill space or steer often feel that way to clients.", 0], ["No question", "That can work too. The question is whether it left them room to keep going.", 1]]]
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
    teaser: "Answer a hard line on instinct, learn P.A.U.S.E. through a worked example, answer again with all five steps, then let the client’s response guide your next move.",
    screens: [
      { kind: "intro", stage: "Start here", title: "Your brain gives you nothing. Now what?",
        text: "P.A.U.S.E. isn’t a magic sentence. It’s a quiet sequence that buys you enough space to listen again, use what the client already gave you, and respond on purpose. You don’t do five dramatic steps while your client waits.",
        pause: true },
      { kind: "take", n: 1, stage: "Start here", title: "Take 1: on instinct.",
        moment: { who: "Client · session 4", ctx: "She’s been describing a hard month. Then she stops and says flatly:", line: "I don’t even know what I feel anymore." },
        text: "Before you learn the steps, answer off the top of your head. Don’t overthink it. You’ll come back to this line." },
      { kind: "walk", stage: "Learn it", title: "Watch it work, one letter at a time.",
        moment: { who: "Client · session 3", ctx: "She’s been going back and forth about her partner for weeks. Today she looks worn out:", line: "Just tell me if I should break up with my partner." },
        text: "Here’s what P.A.U.S.E. sounds like inside your head in a real moment. Tap to see each step.",
        steps: [ /* DRAFT clinical content: for Tiffany's review */
          ["P", "Pause", "Your urge: give her an answer, or start listing pros and cons. Notice it. Take one breath before you speak."],
          ["A", "Attend", "Notice her: she looks worn out, and she’s been stuck on this for weeks. Notice you: you want to rescue her from not knowing."],
          ["U", "Use", "Pick up her words: “just tell me.” Wanting someone else to decide is the part worth exploring."],
          ["S", "Say", "One intentional thing: “It sounds like you really want someone to just tell you.”"],
          ["E", "Explore", "Then let her lead: “What makes it feel like someone else should decide?”"]
        ],
        after: "Notice you’re not refusing to help. You’re helping the client think, while respecting their autonomy." },
      { kind: "tag", stage: "Learn it", title: "What does each response invite?",
        moment: { who: "A different client", line: "I feel like I mess everything up." },
        text: "Three therapists, three responses. None is “wrong” forever. What does each one invite right now?",
        options: [["argue", "Argues with the feeling"], ["technique", "Jumps to a technique"], ["opens", "Opens the experience"]],
        items: [
          ["r1", "“That’s not true. You’ve done so many good things.”", "argue", "Supportive in intent, but it can skip the experience behind the statement."],
          ["r2", "“What evidence supports that thought?”", "technique", "That could fit later. Right now you don’t know what happened yet."],
          ["r3", "“What happened that left you feeling that way?”", "opens", "This uses P.A.U.S.E.: explore before explaining, so you learn what they’re actually describing."]
        ] },
      { kind: "pick", stage: "Learn it", title: "Now she pushes back.",
        moment: { who: "Same client", line: "Don’t try to make me feel better. I just need to say how bad it feels." },
        text: "What do you change?",
        options: [
          ["explain", "Explain why your first response was still true", "Defending the first response keeps you in the argument she just asked you to leave."],
          ["room", "Slow down and make room for the feeling", "Yes. You stop arguing with the feeling and let her say it. That’s explore before explaining in action."],
          ["skill", "Offer a coping skill for the feeling", "Skills have a place, but she just told you what she needs first: room to say it."]
        ], best: "room" },
      { kind: "pausewalk", stage: "Try it", title: "Take 2: same line, all five steps.",
        moment: { who: "Client", line: "I don’t even know what I feel anymore." },
        steps: [
          ["P", "Pause", "What’s your urge right now?", "e.g. to name the feeling for her, to reassure", "P"],
          ["A", "Attend", "What do you notice in her, and in you?", "e.g. flat voice, after a hard month", "A"],
          ["U", "Use", "Which of her words will you use?", "e.g. “anymore”", "U", "req"],
          ["S", "Say", "Your Take 2: one intentional response.", "Type it the way you’d say it", "t2", "big"],
          ["E", "Explore", "What would you want to learn from her answer?", "e.g. when things started feeling numb", "E"]
        ] },
      { kind: "compare", stage: "Try it", title: "Side by side.",
        text: "Look at both takes and answer from your gut. Different answers are information, not grades.",
        examples: { /* DRAFT clinical content: for Tiffany's review. Shown only after the student has written both takes. */
          title: "Other ways to say it",
          note: "There’s no one right line. These are slower, and each one uses her words.",
          items: [
            ["Reflects “anymore”", "Anymore. So there was a time you did know."],
            ["Gently curious", "When did it start feeling like you didn’t know anymore?"],
            ["Names what you noticed", "You said that pretty flatly. What’s it like to not know what you feel?"],
            ["Stays with her", "It sounds like it’s been a while since things really landed for you."],
            ["Simple check-in", "What’s it like right now, saying that out loud?"],
            ["One question, no fixing", "What do you notice when you try to check in with yourself?"]
          ] },
        qs: [
          ["P · Pause", "Which take was led by the urge to fix, reassure, or sound helpful?", ["Take 1", "Take 2", "Both", "Neither"],
            { "Take 1": "That’s the urge P.A.U.S.E. asks you to notice. Spotting it is the skill.", "Take 2": "Worth noticing. Even with the steps, the urge can sneak in. That’s normal.", "Both": "Honest. The urge is strong with a line like this one.", "Neither": "Nice. You stayed out of performance mode both times." }],
          ["A · Attend", "Which take shows you noticed something about her, like her flat tone or the hard month she’s had?", ["Take 1", "Take 2", "Both", "Neither"],
            { "Take 1": "Your instinct was already tracking her. That’s attention as an active skill.", "Take 2": "That’s Attend: you took in what was happening with her before you spoke.", "Both": "You’re reading her, not just her words. Keep that.", "Neither": "Worth a second look: what do her tone and her month tell you?" }],
          ["U · Use", "Which take uses something she actually said?", ["Take 1", "Take 2", "Both", "Neither"],
            { "Take 1": "Your instinct already reached for her words. Keep that.", "Take 2": "That’s Use in action: the next question connects to what she brought.", "Both": "You’re already anchoring in her language. That’s a strength.", "Neither": "Look again at her line. “Anymore” is a word worth picking up." }],
          ["S · Say", "Which take has one clear purpose, instead of doing several things at once?", ["Take 1", "Take 2", "Both"],
            { "Take 1": "A clear first instinct. Notice what made it focused.", "Take 2": "That’s Say: one intentional thing is usually enough.", "Both": "Both stay focused. That makes it easier for her to answer." }],
          ["E · Explore", "Which take makes it easier for her to tell you more?", ["Take 1", "Take 2", "About the same"],
            { "Take 1": "Interesting. Notice what in Take 1 opens the door, and keep it.", "Take 2": "That’s explore before explaining: room for her to go further.", "About the same": "Then both leave room. Next, notice which one has one clear purpose." }],
          ["Your takeaway", "What changed most between your takes?", ["I slowed down", "I used her words", "I picked one purpose", "I got curious instead of fixing", "Not much yet"],
            { "I slowed down": "That’s P doing its job. The space is what lets you listen again.", "I used her words": "That’s U. It shows her your question is connected to what she brought.", "I picked one purpose": "That’s S. One intentional thing is usually enough.", "I got curious instead of fixing": "That’s E: explore before explaining.", "Not much yet": "That’s okay. The steps get familiar with reps, not on the first try." }, { multi: true }]
        ],
        ai: true },
      { kind: "follow", stage: "Try it", title: "She answers. What’s your next move?",
        moment: { who: "Client", line: "I don’t even know what I feel anymore." },
        text: "The last step of P.A.U.S.E. is Explore: let the client’s response guide your next move. Respond to what she just said, not to the plan in your head.",
        fallback: "I don’t know… it’s like I’m numb. I go to work, I come home, and nothing really lands." },
      { kind: "pick", stage: "Know the limit", title: "When the tool isn’t enough.",
        moment: { who: "Client, back to the first example", line: "Just tell me if I should break up with them. They said they’d hurt me if I leave." },
        text: "Same request, one new detail. What’s your priority now?",
        options: [
          ["explore", "Keep running P.A.U.S.E. to explore the decision", "P.A.U.S.E. doesn’t mean spending ten minutes exploring the decision while ignoring safety. This detail changes the priority."],
          ["safety", "Shift to safety: assess risk, follow your agency’s procedures, and consult", "Yes. Risk and safety assessment, procedures, and consultation come first. A good therapist knows when a familiar tool isn’t enough."],
          ["reflect", "Reflect how hard the decision must be, then wait", "Reflecting can feel attuned, but it leaves a possible safety risk unaddressed."]
        ], best: "safety" },
      { kind: "summary", title: "Two takes, one next move, one limit." }
    ]
  };

  const demo = {
    moment: "Just tell me what to do. You’re the therapist. Should I break up with them?",
    hintWhy: "“Because it validates” isn’t enough. What does it help you learn, and what does it avoid?",
    check: "Did you give Jordan the decision back while still being helpful?",
    /* Audio demo: two takes of the same moment. Each line has a code; when its audio file is in
       /course/audio/demo/<code>.mp3, list the code in audioReady and it plays. Until then lines appear at reading pace. */
    audioBase: "/course/audio/demo/",
    audioReady: [],
    walk: [
      { kind: "convo", tone: "rushed", label: "Take 1 · rushed", ctx: "Jordan, 29 · session 3 · just described another fight with their partner", lines: [
        ["t1-01", "J", "Just tell me what to do. You’re the therapist. Should I break up with them?"],
        ["t1-02", "T", "Honestly? From everything you’ve said, it sounds like you should leave."],
        ["t1-03", "J", "Okay… but what if I regret it? We’ve been together four years."],
        ["t1-04", "T", "That’s a normal thing to feel. But you deserve someone who treats you better. You’ve told me how much the fighting wears you down."],
        ["t1-05", "J", "I mean… it’s not always bad. You’ve only heard about the bad parts."],
        ["t1-06", "T", "Sure, but patterns like this usually don’t change on their own."],
        ["t1-07", "J", "Yeah. I guess. … Can we talk about something else?"]
      ] },
      { kind: "explain", title: "What happened in Take 1", points: ["The answer came from pressure to be useful, with only half the story.", "Jordan started defending the relationship instead of exploring it.", "The decision became the therapist’s, and Jordan shut down."] },
      { kind: "convo", tone: "steady", label: "Take 2 · steady", lines: [
        ["t2-01", "J", "Just tell me what to do. You’re the therapist. Should I break up with them?"],
        ["t2-02", "T", "I can hear how exhausted you are, and I get why you’d want someone to just give you a clear answer. I don’t want to make a decision this big for you, but I do want to help you sort through it. What feels hardest right now, staying or leaving?"],
        ["t2-03", "J", "Both. If I stay, I’m scared it’s going to be like this forever. If I leave, I’m scared I’m throwing away four years over stuff that’s fixable."],
        ["t2-04", "T", "So part of you is afraid of being stuck, and part of you is afraid of giving up on something that might still work."],
        ["t2-05", "J", "Yeah. Exactly that."],
        ["t2-06", "T", "When you picture a year from now, what would tell you that you made the right call, either way?"],
        ["t2-07", "J", "… That I’m not walking on eggshells. That I feel like myself again."],
        ["t2-08", "T", "Not walking on eggshells. What happens when you feel like you’re walking on eggshells?"],
        ["t2-09", "J", "I watch everything I say. If I bring something up the wrong way, it turns into a whole fight."],
        ["t2-10", "T", "When the fights happen, do you ever feel unsafe, or like you can’t make your own choices?"],
        ["t2-11", "J", "No, nothing like that. It’s just loud and exhausting. We both say stuff we don’t mean."],
        ["t2-12", "T", "Thank you for telling me. So it sounds like what matters most is feeling like yourself again. Maybe that’s where we start: what would need to change for that to happen, whether you stay or go?"],
        ["t2-13", "J", "… Yeah. I can work with that."]
      ] },
      { kind: "explain", title: "Why Take 2 works", points: ["It names what Jordan is carrying before handing anything back.", "It reflects both fears in Jordan’s own words.", "It asks what matters to Jordan and follows “walking on eggshells.”", "It checks safety plainly, without assuming.", "It ends with a next step Jordan owns."] },
      { kind: "explain", safety: true, title: "If safety comes up", points: ["Had Jordan said yes to feeling unsafe or controlled, assessment and your safety protocol come first, before weighing any options."] }
    ],
    ai: "AI could reply to your “why” with one follow-up question."
  };

  window.TCC6_ACTS = { l1, l2, l3, demo, GAP };
})();
