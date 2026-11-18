/* Clinical Confidence Lab v6: all course copy in one place.
   Source: "The Clinical Confidence Lab: Full Curriculum & Scripts" (Nov 16, 2026) and the v6 design file.
   Client lines, reactions and takes are copied word for word from the scripts doc. Every client is fictional,
   and every client line, reaction and take is DRAFT wording awaiting Tiffany's clinical review.
   Reps 3.1–4.3 only have their one-line moment so far (the scripts doc stops after Rep 2.3): no clinical content
   is invented for them. Add a Wistia ID to VIDEOS to embed a video. */
(function () {
  const IMG = {
    a: "/assets/optimized/clinical-skills-workshop.jpg",
    b: "/assets/optimized/clinical-training-study-tools.jpg",
    c: "/assets/optimized/therapist-professional-development-workshop.jpg",
    d: "/assets/optimized/tiffany-mcgilloway-lpc-900.jpg",
    e: "/assets/optimized/tiffany-mcgilloway-clinical-confidence-lab-900.jpg"
  };

  const AIMS = [
    ["explore", "Explore", "I wanted to understand more"],
    ["reflect", "Reflect", "I wanted them to feel heard"],
    ["validate", "Validate", "I wanted them to feel okay"],
    ["focus", "Focus", "I wanted to give us direction"],
    ["offer", "Offer", "I wanted to help them fix it"],
    ["safety", "Check safety / scope", "I wanted to check something important"]
  ];

  const REP_STEPS = ["The moment", "Your move", "Name your aim", "The client reacts", "Tiffany’s take", "Run it back"];

  const CHECKS = [
    ["Did I use what they gave me?", "Their words, their feeling, their priority."],
    ["Could they disagree with me?", "Without taking care of my feelings."],
    ["Do I know why I said it?", "One sentence. Did safety or scope change the move?"]
  ];

  const PULLS = [["Rescue", "Make the feeling stop"], ["Fix", "Solve the problem"], ["Fill", "End the silence"], ["Defend", "Explain yourself"], ["Prove", "Sound like a good therapist"]];
  const PAUSE = [["P", "Pause the urge to perform"], ["A", "Attend to what’s happening"], ["U", "Use what they gave you"], ["S", "Say one grounded thing"], ["E", "Explore before explaining"]];

  const BASELINE_PROMPT = "What would you say next? There’s no feedback today, so just be honest about what you’d actually say.";
  const BASELINE = [
    { id: "B1", skill: "Notice", client: "Priya", who: "Priya, 34 · telehealth, session 2", context: "Priya, 34, telehealth, session 2. She has spent 10 minutes on her mom’s new cancer diagnosis.", line: "Sorry. I don’t know why I’m telling you all this. You probably have people with real problems." },
    { id: "B2", skill: "Decide", client: "Marcus", who: "Marcus, 41 · session 1", context: "Marcus, 41, session 1.", line: "So my wife says I drink too much, my boss put me on a performance plan, and my son won’t talk to me. Where do we even start?" },
    { id: "B3", skill: "Guide", client: "Ellie", who: "Ellie, 19 · college counseling, minute 25 of 45", context: "Ellie, 19, college counseling, minute 25 of 45. It’s the third session in a row about her roommate.", line: "…and then she took my charger again. Anyway. You know how she is." },
    { id: "B4", skill: "Adapt", client: "Theo", who: "Theo, 52 · session 7", context: "Theo, 52, session 7.", line: "With respect, I don’t think this is working. We just talk." }
  ];

  const GAPS = [
    ["knowledge", "Knowledge", "“I’m fuzzy on the criteria”"],
    ["skill", "Skill", "“I didn’t know how to ask”"],
    ["pressure", "Pressure", "“I wanted to reassure”"],
    ["support", "Support", "“I’d want records or supervision”"]
  ];

  /* One Rep = one record. reactions[aim] = { move?, stage?, says, after?, shows, beat2? } or an array of them. */
  const REPS = [
    { id: "1.1", week: 1, theme: "Notice", lesson: "Confidence Is Not a Personality Trait", client: "Dev", age: 23, title: "“Do you think I do?”",
      context: "Dev, 23, intake session. Dev saw another therapist for a year before moving here.",
      line: "My last therapist said I have BPD. Do you think I do?",
      reactions: {
        offer: { move: "“You don’t seem like you have BPD to me.”", says: "Oh. Okay… so she was wrong? She saw me for a whole year.", shows: "Relief turns into confusion. You weighed in on a diagnosis with 20 minutes of information." },
        validate: { says: "Yeah… but do you think I have it?", shows: "Kind, but the question is still hanging." },
        explore: { says: "Honestly? It scared me. I googled it and it said people with BPD are manipulative. I don’t want to be that.", shows: "The real fear comes out." },
        safety: { says: "Okay. That’s fair. I think I just want someone to tell me I’m not broken.", shows: "Dev trusts you more because you didn’t rush." }
      },
      take: { pull: "Prove", text: "The Pull here is to prove yourself, either by having an answer or by rescuing Dev from a scary label. But you can’t responsibly confirm or rule out a diagnosis at intake.",
        say: "That’s a really important question, and I don’t want to guess. I’d want to get to know you first. Can I ask what that label has meant for you?",
        why: "This is honest about your limits and curious about Dev.", watch: "the question under the question: “Am I broken?”" },
      extra: "gap",
      bank: "When a client asks if I think they have a diagnosis, I can say" },

    { id: "1.2", week: 1, theme: "Notice", lesson: "Meet the Clinician Behind the Reaction", client: "Nia", age: 38, title: "“I don’t think you get me either.”",
      context: "Nia, 38, session 6. She’s describing her mother’s constant criticism. You just offered: “Maybe your mom criticizes because she worries about you.”",
      line: "Honestly? I don’t think you get me either.",
      reactions: {
        offer: { move: "Explain what you meant", says: "Right. Yeah. Never mind.", shows: "She shuts down. You defended your reframe, and she stopped trying." },
        validate: { says: "I mean… yeah.", shows: "Flat. It’s warm, but it doesn’t touch what just happened between you." },
        explore: { move: "“Tell me what I’m missing.”", says: "Everyone explains her to me. I just need someone on my side for a minute.", shows: "The real need comes out." },
        reflect: { move: "Name the miss", says: "…Yeah. Exactly that.", after: "She looks up.", shows: "You’re back in the room together." }
      },
      take: { pull: "Defend", text: "The Pull is Defend. Your reframe wasn’t evil, but it landed as one more person explaining Mom.",
        say: "I think I just did what everyone does: I explained her instead of hearing you. What do you need me to get?",
        watch: "the word “either.” You’re now part of her pattern. That isn’t a failure. It’s the most useful information in the room." },
      bank: "When a client says I don’t get them, I can say" },

    { id: "1.3", week: 1, theme: "Notice", lesson: "Use P.A.U.S.E. When You Go Blank", client: "Sam", age: 27, title: "The Long Silence",
      context: "Sam, 27, agency setting, session 4. Sam just described freezing during a presentation at work. Last session, Sam said they often feel judged.",
      silence: 35, stageLine: "Sam looks down and stops talking.", roomMoment: "35 seconds of silence, then: “I’m trying not to cry because that would be pathetic.”",
      extraAim: ["wait", "Stay quiet", "I’d stay quiet a little longer"],
      reactions: {
        offer: { move: "“It’s okay, everyone bombs a presentation!”", says: "Yeah. Anyway…", after: "Sam changes the subject.", shows: "Fill + Rescue. The moment closes." },
        explore: { move: "A gentle check-in", says: "I’m trying not to cry because that would be pathetic.", shows: "It opens.", beat2: true },
        wait: { stage: "After 10 more seconds:", says: "I’m trying not to cry because that would be pathetic.", shows: "Your patience let Sam get there.", beat2: true }
      },
      beat2: { prompt: "What would you say now?", line: "I’m trying not to cry because that would be pathetic." },
      take: { pull: "Fill", text: "The Pull here is Fill. Silence feels like failing, but Sam may be thinking or feeling. Ask yourself: does the silence look chosen (thinking) or stuck (lost, frozen)? If it’s chosen, wait.",
        sayLabel: "If it’s stuck, offer a gentle check-in", say: "We can take a moment. What’s happening for you right now?",
        beat2Say: "It sounds like part of you is judging the tears before they even get here.",
        watch: "this: Sam feels judged by others, so a rushed rescue can feel like one more judgment." },
      bank: "When a client goes quiet, I can" },

    { id: "2.1", week: 2, theme: "Decide", lesson: "Find the Thread, Not Just the Topic", client: "Rosa", age: 46, title: "Dinner in the car",
      context: "Rosa, 46, ICU nurse, session 3.",
      line: "I snapped at a coworker Tuesday. I haven’t called my sister back in two weeks. And I’ve started eating dinner in my car before I go inside.",
      extra: "miniMap",
      reactions: {
        offer: { move: "“Let’s talk about how to handle the coworker.”", says: "Sure… I mean, she’s fine. I’m the one who’s off.", shows: "You picked a topic, and she’s telling you it isn’t the topic." },
        reflect: { move: "Reflect as a verdict: “It sounds like you’re burned out.”", says: "Everyone in the ICU is burned out.", shows: "A label closes the door, and she’s right that it’s bigger than her." },
        explore: { move: "“What’s it like sitting in the car?”", says: "Quiet. It’s the only quiet part of my day.", shows: "The odd detail was the door." },
        focus: { move: "Offer the thread as a question", says: "…The car is the only place nobody needs anything from me.", shows: "The thread lands, in her words." }
      },
      take: { pull: "Fix", text: "The Pull is Fix: grab the most solvable topic, the coworker. But listen for the detail that doesn’t fit, because that’s often the door.",
        sayLabel: "One way to offer the thread", say: "I’m noticing a few places where you’re needing space before you can face people. Does that fit, or am I off?",
        watch: "context: ICU staffing and moral injury are real, not just Rosa’s “pattern.” A good thread holds both." },
      bank: "When a client brings several topics, I can offer a thread by saying" },

    { id: "2.2", week: 2, theme: "Decide", lesson: "CLEAR: A Clinical Thinking Cycle", client: "Ben", age: 27, title: "“I just feel off.”",
      context: "Ben, 27, telehealth, session 5. His camera is off today, which is new.",
      line: "I just feel… off. I can’t even explain it.",
      reactions: {
        offer: { move: "“Sometimes that’s just stress. Have you been sleeping okay?”", says: "Maybe. I don’t know.", shows: "You explained it for him, and the door closed." },
        explore: { move: "“Off how? When did you first notice it?”", says: "Since Sunday, I think. I haven’t wanted to see anyone.", shows: "Clarify and Locate are working." },
        reflect: { move: "Name what’s different today", says: "Yeah. I didn’t want you to see me like this. I haven’t really been eating either.", shows: "Embody: you noticed the camera, and he opened up.", beat2: true },
        safety: { move: "“Can I ask a few questions, including about safety?”", says: "I’m not going to do anything. I just feel heavy.", shows: "Asking directly is calm and caring, not alarming." }
      },
      beat2: { prompt: "What’s your next move now?", line: "I haven’t really been eating either.", note: "This is Recalibrate. New information can change the priority to assessing mood, sleep, appetite, and safety." },
      take: { pull: "Prove", text: "The Pull is Prove: explain the feeling for him. CLEAR in action: Clarify “off” → Locate when it started → Embody (the camera is off, and that’s data) → Act with one question → Recalibrate when you hear “not eating.”",
        sayLabel: "One way in", say: "It’s hard to put words to. I also noticed your camera’s off today, which is new. What’s that about?",
        watch: "behavior changes. They often tell you more than the words." },
      bank: "When a client can’t name what’s wrong, I can say" },

    { id: "2.3", week: 2, theme: "Decide", lesson: "Choose a Move You Can Explain", client: "Grace", age: 58, title: "“I came here for strategies.”",
      context: "Grace, 58, outpatient, session 2. She’s here about stress with her adult daughter. You’ve asked about feelings three times.",
      line: "Why do you keep asking about my feelings? I came here for strategies.",
      reactions: {
        offer: [
          { move: "Offer theory: “Feelings drive behavior, so…”", says: "I’m 58. I know feelings exist.", shows: "A lecture, and a defensive one." },
          { move: "Offer a tool right away: “Let’s try a breathing exercise.”", says: "Okay… but how does that help with my daughter?", shows: "A strategy with no target." }
        ],
        explore: { move: "“What made strategies feel important?”", says: "My last therapist just listened. For two years. Nothing changed.", shows: "Useful history. Now you know what she’s afraid of." },
        focus: { move: "Focus + explain your purpose", says: "Yes. That’s what I want. The Sunday phone calls. That’s where it all goes wrong.", shows: "You explained your move and gave her a choice, and she gave you the target." }
      },
      take: { pull: "Defend", text: "The Pull is Defend. But her question is fair, and her preference is valid. Matching how a client wants to work is part of good care.",
        say: "Fair question. I ask because I want the strategies to fit what actually happens for you. Want to pick one situation and build a strategy for it together?",
        watch: "what she reveals about her last therapist. It tells you what will make her trust you." },
      bank: "When a client questions my approach, I can explain my purpose by saying" },

    /* Moments only. Full Reps are still to be written in the scripts doc. */
    { id: "3.1", week: 3, theme: "Guide", lesson: "Establishing a useful session direction", client: "Luis", age: 35, moment: "“I don’t really have anything to talk about today.”", pending: true },
    { id: "3.2", week: 3, theme: "Guide", lesson: "Moving into clinical work", client: "Hannah", age: 44, moment: "The third retelling of the custody-exchange argument.", pending: true },
    { id: "3.3", week: 3, theme: "Guide", lesson: "Closing sessions intentionally", client: "Kenji", age: 30, moment: "With 4 minutes left: “Oh, one more thing. I think I’m quitting tomorrow.”", pending: true },
    { id: "4.1", week: 4, theme: "Adapt", lesson: "Debrief the Choice, Not Your Worth", client: "Owen", age: 33, moment: "“That’s not really what I meant.”", pending: true },
    { id: "4.2", week: 4, theme: "Adapt", lesson: "When Your Response Misses", client: "Ivy", age: 26, moment: "A flat laugh after your reframe: “Sure. Silver linings.”", pending: true },
    { id: "4.3", week: 4, theme: "Adapt", lesson: "Build Confidence From Evidence", client: "Walt", age: 67, moment: "“How long have you been doing this?”", pending: true }
  ];

  const WEEKS = [
    { n: 1, theme: "Notice", title: "The Therapist Behind the Therapy", question: "“What’s happening in me right now?”", anchor: "Spotting", anchorLine: "Fix your eyes on one point so the spin doesn’t take you.", client: "Jordan, 29", keep: "Clinical Confidence Profile" },
    { n: 2, theme: "Decide", title: "Getting Unstuck in the Room", question: "“What matters most right now?”", anchor: "Pick the trick", client: "Avery, 32", keep: "Clinical Decision-Making Map" },
    { n: 3, theme: "Guide", title: "From Conversation to Clinical Movement", question: "“Where is this session going?”", anchor: "The routine", client: "Morgan, 41", keep: "Session Roadmap" },
    { n: 4, theme: "Adapt", title: "Recover, Reflect & Recalibrate", question: "“What do I do when it doesn’t go to plan?”", anchor: "The save", client: "Riley, 36", keep: "Showcase, Playbook & 30-Day Plan" }
  ];

  /* Week 1, in the order learners meet it. */
  const WEEK1 = [
    { key: "day1", type: "day1", label: "Day 1", kind: "Day 1 · Welcome + Baseline", short: "Welcome + Day 1 Baseline", title: "Welcome + your starting point",
      desc: "Before any teaching, see where you’re starting.",
      meta: "Welcome video + Baseline", img: IMG.e, video: "welcome", itemsLabel: "The Baseline · moment, your move, your aim" },
    { key: "l1", type: "lesson", rep: "1.1", label: "Lesson 1 + Rep", kind: "Lesson 1 + Rep 1.1", short: "Confidence Is Not a Personality Trait", title: "Confidence Is Not a Personality Trait",
      desc: "Tell apart a knowledge, skill, pressure, and support gap, and pick the next step that fits.", meta: "Video lesson + Rep", img: IMG.e, video: "w1-l1", pull: "The Pull: Prove" },
    { key: "l2", type: "lesson", rep: "1.2", label: "Lesson 2 + Rep", kind: "Lesson 2 + Rep 1.2", short: "Meet the Clinician Behind the Reaction", title: "Meet the Clinician Behind the Reaction",
      desc: "Name your most common Pull, spot its early cues, and use one small reset.", meta: "Video lesson + Rep", img: IMG.a, video: "w1-l2", pull: "The Pull: Defend" },
    { key: "l3", type: "lesson", rep: "1.3", label: "Lesson 3 + Rep", kind: "Lesson 3 + Rep 1.3", short: "Use P.A.U.S.E. When You Go Blank", title: "Use P.A.U.S.E. When You Go Blank",
      desc: "Run P.A.U.S.E. on a hard client line and come up with one grounded response instead of a perfect one.", meta: "Video lesson + Rep", img: IMG.d, video: "w1-l3", pull: "The Pull: Fill · adds the aim “I’d stay quiet a little longer”" },
    { key: "demo", type: "demo", label: "Demo", kind: "Demonstration", short: "When the client asks you to decide", title: "Demo: When the client asks you to decide for them",
      desc: "Watch Tiffany give a rushed take, see why it misses, then watch the steady take. Don’t memorize the words. Watch the decision underneath them.", meta: "Video demo", img: IMG.c, video: "w1-demo",
      quoteLabel: "Jordan, 29 · session 3", context: "Jordan has just described another fight with their partner.", moment: "“Just tell me what to do. You’re the therapist. Should I break up with them?”", pull: "Captions: Why this misses · What changed" },
    { key: "lab", type: "lab", label: "Lab", kind: "Lab · Study the case", short: "The Clinical Blind Spot", title: "Lab: The Clinical Blind Spot",
      desc: "Read Jordan’s session 2 with another therapist and find the moment it went sideways. Then rewrite it your way.", meta: "10–15 min", img: IMG.b,
      itemsLabel: "Five steps", items: [["1", "Spot It", "Tap the line where the session turned."], ["2", "Seen vs. Supplied", "Did Jordan say it, or did the therapist fill it in?"], ["3", "The Pull", "Which Pull drove line 4? Which drove line 8?"], ["4", "P.A.U.S.E. it", "Rewrite line 4 with one prompt per letter."], ["5", "Your move", "Say your new line 4, then compare it with Tiffany’s."]] },
    { key: "sim", type: "sim", label: "Simulation", kind: "Simulation · Sit with the client", short: "Jordan’s Advice Request", title: "Simulation: Jordan’s Advice Request",
      desc: "Now you’re in the chair for session 3. Pick what you’d say at four moments, see how Jordan responds, and adjust when new information changes things.", meta: "10–15 min", img: IMG.c,
      itemsLabel: "Three decision points", items: [["1", "“Just tell me what to do. You’re the therapist. Should I break up with them?”", "Advise · Reassure · Hand it back · Check safety"], ["2", "“I’m paying you because I can’t make decisions on my own.”", "Defend · Reflect · Offer structure"], ["3", "“So… what do I do this week?”", "Assign · Collaborate"]] },
    { key: "reflect", type: "reflect", label: "Reflect", kind: "Reflect & Redo", short: "Reflect & Redo", title: "Reflect & Redo",
      desc: "Look back at the week with the Three Checks, then redo one Rep.", meta: "10 min", img: IMG.b },
    { key: "save", type: "save", label: "Save", kind: "Save it", short: "Clinical Confidence Profile", title: "Your Clinical Confidence Profile",
      desc: "A practical snapshot of what you noticed, what needs practice, and how you’ll respond more intentionally next time. Then pick one small thing to practice this week.", meta: "Yours to keep", img: IMG.d }
  ];

  const REFLECT = [
    ["pull", "Which Pull showed up most for you this week?", ""],
    ["checks", "Pick your weakest Rep. Run the Three Checks on your first answer.", ""],
    ["redo", "Redo it.", "Name the one thing you changed."]
  ];

  const PROFILE = [
    ["moment", "A moment that made me unsure", "Fictional or de-identified"],
    ["meant", "What I told myself it meant", ""],
    ["gap", "My strongest gap", "Knowledge, skill, pressure, or support, plus my evidence. Pre-filled from Rep 1.1"],
    ["pull", "My go-to Pull, and the early cue I notice first", ""],
    ["reset", "My reset", "Feet, breath, slow down, or their words"],
    ["alone", "What I can practice on my own vs. what needs supervision or consultation", ""],
    ["target", "One observable target for the next 7 days", ""]
  ];

  const STRUCTURE = [
    ["Lesson 1 + Rep", "The core idea, practiced right away."],
    ["Lesson 2 + Rep", "The idea gets harder."],
    ["Lesson 3 + Rep", "The tool you keep."],
    ["Demonstration", "Watch Tiffany miss, then redo."],
    ["Lab · Study the case", "Get to know the week’s client on paper."],
    ["Simulation · Sit with the client", "The same client, reacting to your choices."],
    ["Reflect & Redo", "The Three Checks, then one redo."],
    ["Save it", "This week’s tool, plus 3 new bank lines."]
  ];

  const DELIVERABLES = [
    ["1", "Clinical Confidence Profile", "Your gap, your Pull, your reset, one 7-day target"],
    ["2", "Clinical Decision-Making Map", "Week 2 · Decide"],
    ["3", "Session Roadmap", "Week 3 · Guide"],
    ["4", "Clinical Skills Showcase", "Day 1 vs. Week 4, side by side"],
    ["4", "Personal Clinical Playbook", "Everything you build, in one place"],
    ["4", "30-Day Practice Plan", "What you’ll keep practicing after the Lab"]
  ];

  const HEADS = {
    home: ["Welcome to the Lab", "Four weeks of practice with real client moments. You’ll leave with the words, not just the ideas."],
    week: ["The Therapist Behind the Therapy", "Week 1 · Notice · What’s happening in me right now?"],
    rep: ["", "One client moment, your words, the client’s reaction, Tiffany’s take, and a redo."],
    baseline: ["Day 1 Baseline", "Four client moments, before any teaching. Just answer like you would today."],
    reproom: ["Rep Room", "Extra practice whenever you want it. Totally optional, and it never blocks your progress."],
    playbook: ["Clinical Playbook", "Everything you write and save in the Lab, in one place. Come back to it anytime."],
    growth: ["My growth", "Your four Day 1 answers live here. In Week 4 you’ll answer the same moments again and see both side by side."]
  };

  const TIPS = {
    home: "“You’re allowed to be a learner here. If every Rep feels easy, it’s too easy.”",
    week: "“Uncertainty is not incompetence. Good clinical judgment is often slow and unsure.”",
    rep: "“There’s rarely one right sentence. What matters is whether you can say why you said it.”",
    baseline: "“That’s not a test. That’s your proof.”",
    reproom: "“Do the Reps before you look at my answer. Watching without trying is like watching handstand videos from the couch.”",
    playbook: "“Confidence isn’t knowing the perfect line. It’s knowing what your line is for.”",
    growth: "“That’s not a test. That’s your proof.”"
  };

  const BONUS = "Taylor, Casey, Alex, Mo, June and Deshawn. Mixed settings, extra practice whenever you want it.";


  /* Week 1 Lab: The Clinical Blind Spot. Copied from the scripts doc (draft pending clinical review). */
  const LAB = {
    intro: "Jordan’s session 2, with another therapist. It’s far easier to spot a Pull in someone else first. Then you’ll turn the lens on yourself, and this session explains why Jordan asks for advice in session 3.",
    lines: [
      ["Jordan", "We had another fight Sunday. It was about the dishes, but it’s never about the dishes."],
      ["Therapist", "What’s it usually about?"],
      ["Jordan", "I don’t know. I feel like I’m always the one who has to bring stuff up. And then I’m the bad guy."],
      ["Therapist", "That sounds really unfair. Have you tried ‘I’ statements? Like, ‘I feel hurt when…’"],
      ["Jordan", "I guess. I’ve read about those."],
      ["Therapist", "They really help. And maybe set up a weekly check-in so things don’t build up."],
      ["Jordan", "Yeah, maybe.", "looks at phone"],
      ["Therapist", "You deserve someone who actually listens to you."],
      ["Jordan", "…Do you think I should leave?"]
    ],
    turn: 4,
    turnWhy: "Jordan offered something tender (“I’m the bad guy”), and the therapist went straight to a tool.",
    sort: [
      ["Jordan feels like the bad guy for bringing things up", "seen"],
      ["“It’s never about the dishes”", "seen"],
      ["Jordan pulled back after the advice (“Yeah, maybe” + phone)", "seen"],
      ["Jordan’s partner doesn’t listen", "supplied"],
      ["Jordan needs communication skills", "supplied"],
      ["Jordan is thinking about leaving", "supplied", "until line 9, which the therapist invited with line 8"]
    ],
    pull4: "Fix", pull8: "Rescue", gap: "pressure",
    gapWhy: "Most likely pressure: the therapist knew how to explore but rushed.",
    pause: [["P", "Pause", "What’s the Pull?"], ["A", "Attend", "What did Jordan feel?"], ["U", "Use", "Which words will you use?"], ["S", "Say", "One thing."], ["E", "Explore", "What do you want to understand?"]],
    take: "The bad guy. Tell me more about what that’s like.",
    closing: "Notice line 8. When a therapist takes sides, the client often asks them to decide. Next, you’re in the chair for session 3."
  };

  /* Week 1 Simulation: Jordan’s Advice Request. Word for word from the Week 1 Clinical Content Master v1.0
     (Part C). Clinical/editorial approval required before publishing. No "best answer" is marked. */
  const SIM = {
    intro: "You’re in the therapist chair. Jordan asks for help with a decision that feels too big to make alone. You’ll make several choices, see one plausible client reaction to each, and practice adjusting when new information appears.",
    client: "Jordan, 29 · third appointment",
    decisions: [
      { id: "J1", prompt: "What would you say FIRST?",
        line: "Just tell me what to do. You’re the therapist. Should I break up with them?",
        choices: [
          ["J1-A", "Honestly, it sounds like leaving might be the healthiest option.", "Okay… but what if I regret it? Then it’ll be because I listened to you.", "You offered certainty, but you now hold part of a choice Jordan must live with. There’s too much you don’t know. Notice whether urgency to help moved you into deciding for them."],
          ["J1-B", "I can hear how stuck and tired you are. We can sort through this together, but I don’t want to make the decision for you. What’s hardest about it right now?", "I think I’m scared that whichever choice I make, it’ll be the wrong one.", "This combines attunement with autonomy and opens a clinically useful fear. You still need context—including whether Jordan has freedom to choose safely."],
          ["J1-C", "Before we weigh your options, can I ask whether you feel safe and free to make choices in this relationship?", "I mean… mostly. It’s complicated. Why do you ask?", "You opened an appropriate assessment door without making a conclusion. Explain the purpose and use Jordan’s answer to explore, rather than assuming the answer is either yes or no."]
        ] },
      { id: "J2", bridge: "Jordan takes a breath and looks at you again.", prompt: "The pressure is rising. What is your next move?",
        line: "But I’m paying you because I can’t make decisions on my own. I thought you’d know what I should do.",
        choices: [
          ["J2-A", "I do know. I just don’t want to tell you yet.", "That makes it sound like you’re testing me. I already feel stupid about this.", "This may intensify shame and position you as the keeper of a secret answer. Repairing the relationship and clarifying your collaborative role may help."],
          ["J2-B", "I get why you’d want a clear answer. My role is to help you understand your options and what matters to you, not decide your life for you. What would you hope my answer gives you?", "Relief, I guess. Like maybe I wouldn’t be responsible if things go badly.", "You explore what certainty would do for Jordan rather than debating whether a therapist should give advice. That meaning can inform the next step."],
          ["J2-C", "I hear how hard this is. What happens between you and your partner when you disagree or try to make a decision they don’t like?", "They get really angry. I usually stop arguing because it doesn’t feel worth it.", "You begin gathering relevant relationship context. The answer can raise further questions about control, danger, and freedom to make decisions."]
        ] },
      { id: "J3", bridge: "As you keep talking about the relationship, Jordan shares something you haven’t heard before.", banner: "New information: reassess the priority.", prompt: "What needs attention FIRST now?",
        line: "They check my phone sometimes. Last week I said I might need space, and they told me I’d regret it if I left. I don’t even know what they meant, but it scared me.",
        choices: [
          ["J3-A", "That’s a red flag. You need to break up with them tonight.", "Tonight? They’d see my messages. I don’t think you understand what I’m worried about.", "A directive to leave immediately can escalate danger or undermine trust when safety isn’t understood. Return to assessment and client-defined priorities; don’t impose a plan."],
          ["J3-B", "I’m glad you told me. Hearing that they check your phone and that the comment frightened you makes me want to understand your safety. Are you safe right now, and are you able to talk privately today?", "I’m alone right now. I don’t think they’re coming here, but I’m worried they’ll go through my phone later.", "You acknowledge the disclosure and begin checking current safety and privacy. The next step is a fuller assessment, guided by setting protocols and the client’s situation—not a generic coping worksheet."],
          ["J3-C", "Let’s make a pros-and-cons list of staying versus leaving.", "That’s what I’ve been doing in my head. It doesn’t change the fact that I’m scared of how they’ll react.", "Decision tools may be useful later, but this response bypasses a possible safety issue. Shift priorities to understanding risk, privacy, supports, and applicable procedures."]
        ] },
      { id: "J4", prompt: "What is a responsible next response?",
        line: "I don’t want to make things worse. And I don’t want you to tell me I have to leave. I just need to know what I can do.",
        choices: [
          ["J4-A", "You don’t have to decide about leaving right now. Can we first talk about what feels safe for you today and what support or resources you might want?", "That would help. I can talk here, but I don’t want anything sent to my phone.", "This preserves choice, prioritizes safety and privacy, and invites collaboration. Review confidentiality and communication practices that fit the setting, and follow relevant protocols."],
          ["J4-B", "If you aren’t ready to leave, maybe we should work on your communication skills with your partner.", "I do try to explain myself. That’s usually when they get angrier.", "Ordinary communication-skills framing can miss coercion and danger. A client’s reluctance to leave does not justify pushing mutual-conflict exercises without adequate assessment."],
          ["J4-C", "We need to call the police together immediately.", "Please don’t do that without talking to me. I’m scared of what would happen afterward.", "Emergency action can be required when an imminent danger or legal duty applies, but this vignette does not establish that threshold. Assess immediacy, explain confidentiality and its limits, consult policy, and collaborate where possible."]
        ] }
    ],
    practice: {
      title: "Your turn—one grounded response",
      quote: "I don’t want to make things worse… I just need to know what I can do.",
      prompt: "Try a 20–30-second response in your own words. You can speak it privately or type it. You do not need to submit a recording.",
      purposes: ["Immediate safety", "Privacy and communication", "Client autonomy", "Support/resource options", "Repair after a missed response", "Other"]
    },
    debrief: {
      title: "What changed when you learned more?",
      pull: "What did you feel pulled to do when Jordan asked you to decide?",
      shift: "When Jordan described phone monitoring and a threatening comment, what changed about your clinical priority?",
      redo: "One response I would redo, and how I would say it instead…",
      compare: [
        "Early in the conversation, collaborative exploration and a check on Jordan’s freedom to choose are defensible directions.",
        "After the new disclosure, safety and privacy assessment become a priority. Don’t assume a complete risk picture, promise safety, or decide for the client.",
        "P.A.U.S.E. helps you orient; it does not override risk assessment, mandated procedures, consultation, or scope of practice.",
        "If your first move missed something, you can acknowledge it and redirect: ‘I think I moved too quickly toward options. I want to understand what feels safe for you first.’"
      ]
    }
  };

  /* Week 1 Clinical Confidence Profile: seven-day practice builder (Content Master Part D). */
  const PLAN = {
    intro: "Choose one small skill you can actually rehearse this week. You’re looking for observable practice, not a feeling of confidence.",
    fields: [
      ["skill", "One skill", ["Pause before answering a client’s request for advice.", "Separate observations from assumptions.", "Notice a pressure cue and give myself one breath.", "Ask a purposeful clarification question.", "Recognize when I need consultation or further assessment."]],
      ["rehearse", "How I’ll rehearse", ["Three 2-minute fictional practice reps", "Two 5-minute role-plays", "My own plan"]],
      ["evidence", "How I’ll know it’s working", ["I can say one grounded response and explain its purpose", "I can name one observation and one hypothesis", "I can notice and interrupt my rush to reassure"]],
      ["support", "Support plan", ["Consult supervisor/clinical mentor", "Review an assessment or practice protocol", "Seek focused training", "Peer role-play with fictional cases", "Not needed for this selected practice rep"]],
      ["adjust", "One adjustment I will test next time", null]
    ]
  };

  /* Wistia IDs go here when videos are recorded, e.g. VIDEOS["w1-l1"] = "abc123xyz". */
  const VIDEOS = {};

  window.TCC6 = { IMG, AIMS, REP_STEPS, CHECKS, PULLS, PAUSE, BASELINE_PROMPT, BASELINE, GAPS, REPS, WEEKS, WEEK1, REFLECT, PROFILE, STRUCTURE, DELIVERABLES, HEADS, TIPS, BONUS, VIDEOS, LAB, SIM, PLAN };
})();
