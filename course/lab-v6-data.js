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

  const REP_STEPS = ["The moment", "Your move", "Name your aim", "The client reacts", "One way to handle it", "Run it back"];

  const CHECKS = [
    ["Did I use what they gave me?", "Their words, their feeling, their priority."],
    ["Could they disagree with me?", "Without taking care of my feelings."],
    ["Do I know why I said it?", "One sentence. Did safety or scope change the move?"]
  ];

  const PULLS = [["Rescue", "Make the feeling stop"], ["Fix", "Solve the problem"], ["Fill", "End the silence"], ["Defend", "Explain yourself"], ["Prove", "Sound like a good therapist"]];
  const PAUSE = [["P", "Pause: Slow down instead of rushing to respond."], ["A", "Attend: Notice what’s happening with the client and within yourself."], ["U", "Use: Use the clinical information you already have."], ["S", "Say: Choose one intentional, clinically appropriate response."], ["E", "Explore: Notice what happens next and let the client’s response guide your next move."]];

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
      take: { pull: "Prove", text: "A common pull here is to prove yourself, either by having an answer or by rescuing Dev from a scary label. But you can’t responsibly confirm or rule out a diagnosis at intake.",
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
      take: { pull: "Defend", text: "A common pull here is Defend. Your reframe wasn’t evil, but it landed as one more person explaining Mom.",
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
      take: { pull: "Fill", text: "A common pull here is Fill. Silence feels like failing, but Sam may be thinking or feeling. Ask yourself: does the silence look chosen (thinking) or stuck (lost, frozen)? If it’s chosen, wait.",
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
      take: { pull: "Fix", text: "A common pull here is Fix: grab the most solvable topic, the coworker. But listen for the detail that doesn’t fit, because that’s often the door.",
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
      take: { pull: "Prove", text: "A common pull here is Prove: explain the feeling for him. CLEAR in action: Clarify “off” → Locate when it started → Embody (the camera is off, and that’s data) → Act with one question → Recalibrate when you hear “not eating.”",
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
      take: { pull: "Defend", text: "A common pull here is Defend. But her question is fair, and her preference is valid. Matching how a client wants to work is part of good care.",
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
    { key: "l1", type: "lesson", rep: "1.1", label: "Lesson 1 + Practice", kind: "Lesson 1 + Practice", short: "Confidence Is Not a Personality Trait", title: "Confidence Is Not a Personality Trait",
      desc: "Feeling unsure in session doesn’t mean you’re not cut out for this. Learn how to figure out what’s actually missing in a hard moment, so you know what to work on next.", meta: "Video lesson + practice", img: IMG.e, video: "w1-l1", pull: "The Pull: Prove" },
    { key: "l2", type: "lesson", rep: "1.2", label: "Lesson 2 + Practice", kind: "Lesson 2 + Practice", short: "Meet the Clinician Behind the Reaction", title: "Meet the Clinician Behind the Reaction",
      desc: "When a session gets hard, most of us feel an urge to rush in: fix it, explain ourselves, fill the silence. Learn to notice yours early and slow it down.", meta: "Video lesson + practice", img: IMG.a, video: "w1-l2", pull: "The Pull: Defend" },
    { key: "l3", type: "lesson", rep: "1.3", label: "Lesson 3 + Practice", kind: "Lesson 3 + Practice", short: "Use P.A.U.S.E. When You Go Blank", title: "Use P.A.U.S.E. When You Go Blank",
      desc: "A simple five-step tool for the moments your mind goes blank, so you can find one steady thing to say instead of the perfect thing.", meta: "Video lesson + practice", img: IMG.d, video: "w1-l3", pull: "The Pull: Fill · adds the aim “I’d stay quiet a little longer”" },
    { key: "demo", type: "demo", label: "Demo", kind: "Demonstration", short: "When the client asks you to decide", title: "Demo: When the client asks you to decide for them",
      desc: "A client asks you to just tell them what to do. Watch a rushed response, see why it misses, then watch a steadier one.", meta: "Video demo", img: IMG.c, video: "w1-demo",
      quoteLabel: "Jordan, 29 · session 3", context: "Jordan has just described another fight with their partner.", moment: "“Just tell me what to do. You’re the therapist. Should I break up with them?”", pull: "Captions: Why this misses · What changed" },
    { key: "lab", type: "lab", label: "Lab", kind: "Lab · Study the case", short: "The Clinical Blind Spot", title: "Lab: The Clinical Blind Spot",
      desc: "Read a short session with Jordan and another therapist. Find the moment it went off track, then rewrite that moment your way.", meta: "10–15 min", img: IMG.b,
      itemsLabel: "Five steps", items: [["1", "Spot It", "Tap the line where the session turned."], ["2", "Seen vs. Supplied", "Did Jordan say it, or did the therapist fill it in?"], ["3", "The Pull", "Which Pull drove line 4? Which drove line 8?"], ["4", "P.A.U.S.E. it", "Rewrite line 4 with one prompt per letter."], ["5", "Your move", "Write your new line 4, then compare it with another version."]] },
    { key: "sim", type: "sim", label: "Simulation", kind: "Simulation · Sit with the client", short: "Jordan’s Advice Request", title: "Simulation: Jordan’s Advice Request",
      desc: "Now you’re the therapist. Pick what you’d say at each moment with Jordan and see how Jordan responds.", meta: "12–15 min", img: IMG.c,
      itemsLabel: "Eight moments with Jordan", items: [["1", "“I’ve been thinking about what we talked about. Should I break up with Sam? I need you to tell me what you would do.”", "Where it starts"], ["8", "“I still want you to tell me what I should do. But I think I also know I need a plan.”", "Where it ends"]] },
    { key: "reflect", type: "reflect", label: "Reflect", kind: "Reflect & Redo", short: "Reflect & Redo", title: "Reflect & Redo",
      desc: "Pick one of your Reps, check how it went, and try it one more time.", meta: "10 min", img: IMG.b },
    { key: "save", type: "save", label: "Save", kind: "Save it", short: "Clinical Confidence Profile", title: "Your Clinical Confidence Profile",
      desc: "Pull together what you noticed about yourself this week, and pick one small thing to practice next.", meta: "Yours to keep", img: IMG.d }
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
    ["Lesson 1 + Practice", "The core idea, practiced right away."],
    ["Lesson 2 + Practice", "The idea gets harder."],
    ["Lesson 3 + Practice", "The tool you keep."],
    ["Demonstration", "A rushed response, then a steady one."],
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
    act: ["Practice", "One short screen at a time."],
    live: ["Live session", "Practice with an AI client who reacts to your exact words."],
    rep: ["", "One client moment, your words, the client’s reaction, one way to handle it, and a redo."],
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
    pause: [["P", "Pause", "Slow down. What’s rushing you?"], ["A", "Attend", "What’s happening with Jordan, and in you?"], ["U", "Use", "What clinical information do you already have?"], ["S", "Say", "One intentional, clinically appropriate response."], ["E", "Explore", "What will you watch for in Jordan’s response?"]],
    take: "The bad guy. Tell me more about what that’s like.",
    takeWhy: "It uses Jordan’s own words (“the bad guy”) and invites Jordan to say more, instead of jumping to a tool. You find out what it’s like for Jordan before deciding what would help.",
    closing: "Notice line 8. When a therapist takes sides, the client often asks them to decide. Next, you’re in the chair for session 3.",
    line8: ["When the therapist took Jordan’s side (line 8):", "Jordan asked the therapist to decide (line 9):"]
  };

  /* Week 1 Simulation content lives in lab-v6-sims.js (TCC6_SIMS.jordan). */

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

  window.TCC6 = { IMG, AIMS, REP_STEPS, CHECKS, PULLS, PAUSE, BASELINE_PROMPT, BASELINE, GAPS, REPS, WEEKS, WEEK1, REFLECT, PROFILE, STRUCTURE, DELIVERABLES, HEADS, TIPS, BONUS, VIDEOS, LAB, PLAN };
})();
