/* Four text-based clinical simulations (Weeks 1-4). Word for word from
   'TCC Four Text Simulations Codex Master'. Clinical review required before publishing.
   Choice tuple: [id, therapist line, client reaction, what this move was trying to do, what to watch for]. */
window.TCC6_SIMS = {
 /* Week 1 (key kept as "jordan" so saved progress still loads): Imani, DRAFT awaiting Tiffany's clinical review. */
 "jordan": {
  "week": 1,
  "client": "Imani",
  "title": "Imani’s Secret",
  "skill": "Notice pressure, stay honest about limits, respond intentionally",
  "setup": "Imani, 22, is in session three. She’s in her third year of nursing school and has been describing burnout. Today she’s quieter than usual. No safety concerns have been disclosed so far.",
  "moments": [
   {
    "id": "jordan-01",
    "client": "Before I say this… can you promise you won’t tell anyone? Not my parents, not the school. Anyone.",
    "choices": [
     [
      "A",
      "I want you to be able to tell me. I also want to be honest first: almost everything stays here, but if I’m worried about your safety, I may need to bring someone in. What are you worried I’d share?",
      "That’s kind of what I was afraid of. … It’s about school. And my parents can’t find out.",
      "Is honest about the limits of confidentiality before she discloses.",
      "A long, formal explanation can feel like a wall. Keep it brief and warm."
     ],
     [
      "B",
      "Most of what you tell me stays between us. What’s on your mind?",
      "Most? … Okay. It’s not a big deal anyway.",
      "Keeps the door open without overpromising.",
      "A vague “most” leaves her guessing. Say plainly what would and wouldn’t stay private."
     ],
     [
      "C",
      "It sounds like this is hard to say. What makes you worried about it getting out?",
      "My parents would make me come home. And the school might pull me from clinicals.",
      "Explores the fear behind the request.",
      "You still owe her an honest answer about confidentiality before she shares something serious."
     ]
    ]
   },
   {
    "id": "jordan-02",
    "client": "I haven’t really been going to clinicals. I keep calling in sick. Like, a lot.",
    "choices": [
     [
      "A",
      "Walk me through what happens on the mornings you call in.",
      "I wake up, feel sick about going, text my instructor, and then lie in bed all day.",
      "Collects concrete detail rather than jumping to labels.",
      "A detail-oriented approach can miss the shame in the room."
     ],
     [
      "B",
      "That sounds like a lot to be carrying by yourself.",
      "I mean, it’s my own fault. I’m the one not going.",
      "Reflects the weight of it and reduces isolation.",
      "Validation alone may not show how the pattern unfolds."
     ],
     [
      "C",
      "What do you imagine would happen if you went?",
      "Everyone would see I don’t know what I’m doing.",
      "Explores the fear driving the avoidance.",
      "Can sound like you’re building a case for going. Stay curious, not persuasive."
     ]
    ]
   },
   {
    "id": "jordan-03",
    "client": "You probably think I’m just lazy.",
    "choices": [
     [
      "A",
      "I don’t. I’m more curious what you call it, when you can’t get out of bed.",
      "Honestly? I don’t know. Everything just feels heavy.",
      "Answers her honestly, then hands the meaning back to her.",
      "A quick “I don’t” can sound automatic. Make sure the follow-up shows you mean it."
     ],
     [
      "B",
      "Lazy people don’t usually lie awake feeling this bad about it.",
      "… Maybe. It still feels like I’m lazy.",
      "Offers a reframe grounded in what she’s told you.",
      "Arguing with self-judgment can turn into a debate she has to win or lose."
     ],
     [
      "C",
      "What makes you expect that I’d think that?",
      "Because that’s what my dad would say.",
      "Explores where the judgment comes from.",
      "She may need a direct answer first, or the question can feel like a dodge."
     ]
    ]
   },
   {
    "id": "jordan-04",
    "client": "Some nights I think it’d be easier if I just didn’t wake up. Last week I counted my sleeping pills. … That’s the part I didn’t want anyone to know.",
    "choices": [
     [
      "A",
      "I’m really glad you told me. I want to ask you directly: are you thinking about killing yourself? And do you still have the pills with you?",
      "Not right now. But I’ve thought about it more than I want to admit. They’re in my nightstand.",
      "Asks about suicide directly and checks access to means.",
      "Asking directly doesn’t plant the idea. Follow with a full risk assessment, not a single question."
     ],
     [
      "B",
      "That changes what I want us to focus on today. Can we set school aside and talk about these thoughts?",
      "Okay. I didn’t know if I was allowed to say it.",
      "Recalibrates the session’s priority when high-risk information appears.",
      "Follow through with direct suicide risk questions. Shifting focus alone isn’t an assessment."
     ],
     [
      "C",
      "I’m concerned about your safety. Is it okay if I ask some direct questions about these thoughts and the pills?",
      "Yeah. I’ve never told anyone this.",
      "Explains the reason for direct questions and invites collaboration.",
      "Asking permission shouldn’t delay the assessment."
     ]
    ]
   },
   {
    "id": "jordan-05",
    "client": "So are you going to tell my parents now?",
    "choices": [
     [
      "A",
      "Right now I’m not planning to call anyone. I want to understand how safe you are. And if I ever did need to involve someone, I’d tell you first and we’d talk about it together.",
      "… Okay. As long as you tell me first.",
      "Answers honestly and keeps her part of any decision.",
      "Don’t promise more than your risk assessment and your setting’s rules allow."
     ],
     [
      "B",
      "What happens next depends on how safe you are. Can I ask a few more questions so we can figure that out together?",
      "Fine. But I’m not going to do anything.",
      "Ties the answer to safety and keeps the assessment moving.",
      "Without some reassurance about the process, she may start holding back."
     ],
     [
      "C",
      "What would it be like if your parents knew?",
      "They’d panic. My mom would drive up tonight.",
      "Explores what she fears about them finding out.",
      "Leaves her question unanswered at the moment she’s most worried about trust."
     ]
    ]
   },
   {
    "id": "jordan-06",
    "client": "I’m not going to do anything. I just get so tired. Maybe I’m being dramatic.",
    "choices": [
     [
      "A",
      "We don’t need to decide whether you’re being dramatic to take this seriously. What would help you feel safer this week?",
      "Maybe asking my roommate to hold onto the pills.",
      "Validates the concern and invites a client-led safety step.",
      "Make it specific: who, when, and what she’ll do if the thoughts get stronger."
     ],
     [
      "B",
      "When the thoughts get strong, what do you usually do, and who could you reach?",
      "Scroll on my phone until I fall asleep. My roommate’s usually home.",
      "Works toward a safety plan with coping steps and contacts.",
      "Include crisis resources, like 988, alongside personal contacts."
     ],
     [
      "C",
      "How often have these thoughts been coming up, and have they been getting stronger?",
      "More since midterms. Most nights this month.",
      "Assesses frequency and escalation.",
      "Assessment needs to lead to a concrete plan, not just more questions."
     ]
    ]
   },
   {
    "id": "jordan-07",
    "client": "I don’t want this to be a whole thing. Can we just go back to talking about school?",
    "choices": [
     [
      "A",
      "We can come back to school. Before we do, I want us to make a plan for the hard nights, because that matters most to me today.",
      "Okay. Yeah. That’s fair.",
      "Respects her request while keeping safety first.",
      "Say it warmly, so it doesn’t feel like you’re overruling her."
     ],
     [
      "B",
      "I hear that this feels like a lot. What would make it feel less like a whole thing?",
      "If it stayed small. Like, just between us, and small steps.",
      "Explores her discomfort and invites her to shape the plan.",
      "“Just between us” may come up again. Stay honest about the limits."
     ],
     [
      "C",
      "Of course. What’s coming up at school this week?",
      "Clinicals Tuesday. I’ll probably call in.",
      "Follows her lead and lowers the tension.",
      "Moving on before there’s a safety plan leaves the risk unaddressed."
     ]
    ]
   },
   {
    "id": "jordan-08",
    "client": "Thanks for not freaking out. So… what now?",
    "choices": [
     [
      "A",
      "Let’s write down your plan for hard nights before you go: the warning signs, what you’ll do, who you’ll reach, and what happens with the pills.",
      "I’ll ask my roommate to hold them tonight. Can I text you if it gets bad?",
      "Turns the session toward a specific, written safety plan, including access to means.",
      "Be clear about how and when she can reach you, include 988, and set your next check-in."
     ],
     [
      "B",
      "Here’s what I’d like: a plan for tonight, a check-in before our next session, and one person you’d let in. What feels doable?",
      "Tonight and the check-in. I’m still thinking about the person.",
      "Gives clear structure while letting her choose the pieces.",
      "Follow up on the support person next time, and consult as your setting requires."
     ],
     [
      "C",
      "What feels different now compared with when you walked in?",
      "I said it out loud and nothing exploded.",
      "Consolidates what shifted for her.",
      "Don’t close without a concrete safety plan and a next contact."
     ]
    ]
   }
  ],
  "debrief": [
   "Which choice was driven most by your own urge to keep Imani comfortable?",
   "Where did new information require a change in clinical priority?",
   "Draft one brief closing that includes a collaborative safety step and is honest about what stays private and what doesn’t."
  ]
 },
 "avery": {
  "week": 2,
  "client": "Avery",
  "title": "Too Many Threads",
  "skill": "Clarify the focal point, test hypotheses, and recalibrate",
  "setup": "Avery, 34, attends after reporting anxiety, poor sleep, and feeling overwhelmed at work and home. Their treatment goals are broad. No acute safety concerns have been reported. Notice when you start pursuing the most vivid detail instead of the most useful thread.",
  "moments": [
   {
    "id": "avery-01",
    "client": "I barely slept, my manager is on me, I snapped at my partner, and I forgot to text my friend back. Everything is going badly.",
    "choices": [
     [
      "A",
      "There’s a lot competing for attention. Which part feels most urgent to understand today?",
      "Work. No—maybe sleep. It all connects.",
      "Collaboratively prioritizes.",
      "May need a more guided focal question when the client cannot rank concerns."
     ],
     [
      "B",
      "When you say it all connects, what tends to happen first in that chain?",
      "I wake up worrying about work, then I’m exhausted and irritable.",
      "Searches for a maintaining sequence.",
      "Could imply a single causal order before collecting enough context."
     ],
     [
      "C",
      "Can we spend a minute mapping the work, sleep, and relationship pieces, then choose where to focus?",
      "Yes, because I honestly can’t sort it out.",
      "Offers a transparent structure.",
      "Watch time; mapping can become an end in itself."
     ]
    ]
   },
   {
    "id": "avery-02",
    "client": "At work I reread every email. I’m afraid one mistake will get me fired.",
    "choices": [
     [
      "A",
      "What happens in the moment right before you reread it?",
      "My stomach drops and I picture my boss getting angry.",
      "Finds a micro-sequence for intervention.",
      "Stays close to email behavior while broader work context may matter."
     ],
     [
      "B",
      "What evidence makes being fired feel likely, and what evidence points another way?",
      "My boss corrected a report last month. I know that’s not the same as firing me.",
      "Tests a prediction collaboratively.",
      "Cognitive examination may feel premature if work conditions are genuinely threatening."
     ],
     [
      "C",
      "What does rereading do for you immediately, and what does it cost you later?",
      "I feel calmer for a minute, but I lose so much time.",
      "Identifies a possible maintaining loop.",
      "Function is a hypothesis, not proof that this is the central issue."
     ]
    ]
   },
   {
    "id": "avery-03",
    "client": "It takes forever to send anything. Then I work late and my partner gets irritated.",
    "choices": [
     [
      "A",
      "That sounds like a loop: fear, checking, overtime, then tension at home. Does that fit?",
      "Yes, except my manager also sends messages at night.",
      "Offers a working formulation and invites correction.",
      "Needs refinement for actual workplace demands."
     ],
     [
      "B",
      "What have you and your partner tried when this keeps happening?",
      "They ask me to log off, and then I get defensive.",
      "Explores interpersonal effects and current strategies.",
      "Could shift away from the work behavior before confirming the focal point."
     ],
     [
      "C",
      "If we could change one part of that sequence this week, where would the difference be most noticeable?",
      "Maybe not checking every sentence three times.",
      "Converts a broad problem into a target.",
      "Ensure the target is realistic given job expectations."
     ]
    ]
   },
   {
    "id": "avery-04",
    "client": "Actually, the late messages aren’t optional. My team is understaffed, and people have been laid off.",
    "choices": [
     [
      "A",
      "That changes the picture. We should separate realistic work pressure from the predictions your anxiety adds. Can we look at both?",
      "Exactly. I don’t want you to tell me it’s all in my head.",
      "Revises formulation when contextual evidence appears.",
      "Avoid assuming which part is anxiety versus a reasonable response."
     ],
     [
      "B",
      "What are the actual expectations, and which parts are assumptions you’re filling in?",
      "I know I need to be available after hours, but nobody said every email must be perfect.",
      "Differentiates constraints from interpretations.",
      "May need space for emotional strain of instability."
     ],
     [
      "C",
      "Would it make sense to shift our focus from eliminating worry to protecting your capacity in a demanding environment?",
      "That feels closer to what I need.",
      "Reprioritizes to fit context and values.",
      "Do not foreclose work on checking behavior if Avery wants it."
     ]
    ]
   },
   {
    "id": "avery-05",
    "client": "When I go home, I’m still at work in my head. I’m not really there with my partner.",
    "choices": [
     [
      "A",
      "What would being more present for ten minutes actually look like?",
      "Putting my phone away and hearing about their day.",
      "Translates an aspiration into behavior.",
      "An individual action cannot alone fix systemic overwork."
     ],
     [
      "B",
      "What happens inside you when you try to stop thinking about work?",
      "I feel irresponsible, like I’m about to get caught relaxing.",
      "Identifies a belief and emotional barrier.",
      "More exploration may delay practical steps."
     ],
     [
      "C",
      "Do you want to focus on a transition ritual after work, or on negotiating the boundaries of your actual role?",
      "I’m leaning toward a transition, but I need a realistic plan.",
      "Shares decision-making on intervention level.",
      "Offer choices without implying the client has full control of their workplace."
     ]
    ]
   },
   {
    "id": "avery-06",
    "client": "I tried a phone boundary before. I lasted one day and felt like I failed.",
    "choices": [
     [
      "A",
      "What made day two harder than day one?",
      "A last-minute message from my manager. I panicked and responded.",
      "Investigates a specific obstacle rather than labeling nonadherence.",
      "May need first to address the client’s self-criticism."
     ],
     [
      "B",
      "One difficult day doesn’t mean the experiment taught us nothing. What did you learn about the situations where it gets hardest?",
      "That I need a plan for genuinely urgent work messages.",
      "Reframes unsuccessful attempts as feedback.",
      "Do not minimize distress if the work demand is punitive."
     ],
     [
      "C",
      "We may have set the boundary too broadly. Want to build a smaller test around one evening?",
      "I might actually try that.",
      "Adjusts task difficulty.",
      "Check whether the smaller test fits current occupational expectations."
     ]
    ]
   },
   {
    "id": "avery-07",
    "client": "I forgot something: my partner told me yesterday they’re tired of being treated like an afterthought.",
    "choices": [
     [
      "A",
      "How did that land with you, and what do you want them to understand?",
      "I felt awful. I don’t want them to think they don’t matter.",
      "Attends to meaning and relationship impact.",
      "Can shift the agenda unless the link to the focal loop remains explicit."
     ],
     [
      "B",
      "It sounds like the cost of this pattern has become important. Does that change what you want from today?",
      "Yes. I want to do something different at home, not just talk about anxiety.",
      "Checks relevance of the existing focus.",
      "Requires an actual adjustment rather than simply another insight."
     ],
     [
      "C",
      "Can we connect the work pattern to one specific repair or conversation at home?",
      "I could tell them what I’m working on instead of just apologizing again.",
      "Connects formulation to meaningful action.",
      "Don’t turn a complex relational issue into a homework task without consent."
     ]
    ]
   },
   {
    "id": "avery-08",
    "client": "If I leave here with five things to try, I’ll do none of them.",
    "choices": [
     [
      "A",
      "Then let’s choose one. What would be a worthwhile, manageable experiment before we meet again?",
      "Ten minutes of being present after dinner, without pretending work isn’t stressful.",
      "Honors limits and asks for a client-owned action.",
      "Ensure the task does not become another performance demand."
     ],
     [
      "B",
      "We can leave with a plan and a backup for when work intrudes. What should the backup be?",
      "If I have to respond to work, I’ll tell my partner and reconnect afterward.",
      "Builds implementation planning and flexibility.",
      "Check that the backup is actually doable in their context."
     ],
     [
      "C",
      "Let’s summarize the loop we identified and decide what we’ll measure next week.",
      "I could track when the checking starts and whether the evening goes differently.",
      "Creates an observable feedback target.",
      "Self-monitoring can intensify perfectionism if too elaborate."
     ]
    ]
   }
  ],
  "debrief": [
   "Name two competing focal-point hypotheses and one detail that changed your thinking.",
   "Which response best balanced psychological process with actual environmental stress?",
   "Write a 20-second clinical formulation and one collaboratively chosen next step."
  ]
 },
 "morgan": {
  "week": 3,
  "client": "Morgan",
  "title": "Insight Without Change",
  "skill": "Guide the opening, middle, and closing toward movement",
  "setup": "Morgan, 31, is in ongoing treatment for interpersonal anxiety. They understand that they avoid conflict, but sessions repeatedly end with good insight and no change outside therapy. No acute safety concerns have been reported.",
  "moments": [
   {
    "id": "morgan-01",
    "client": "I figured out why I do it. I grew up keeping everyone happy. But I still said yes when my coworker dumped their work on me.",
    "choices": [
     [
      "A",
      "You made an important connection. What happened between knowing that and saying yes?",
      "They looked stressed, and I answered before I could think.",
      "Targets the insight-action gap.",
      "May bypass pride or grief associated with the insight."
     ],
     [
      "B",
      "What feels most important about that experience to work on today?",
      "I’m tired of having the same conversation every week.",
      "Invites a shared session destination.",
      "A broad opening may need more structure to prevent repetition."
     ],
     [
      "C",
      "Can we try something different today and rehearse the moment before you agree?",
      "I’m nervous, but yes.",
      "Proposes an in-session behavioral rehearsal.",
      "Needs buy-in and a brief assessment of what makes rehearsal safe and useful."
     ]
    ]
   },
   {
    "id": "morgan-02",
    "client": "They said, ‘Can you cover this?’ and my mouth said yes. Then I got home angry.",
    "choices": [
     [
      "A",
      "What did you notice in your body right before you answered?",
      "I got hot and tight in my chest.",
      "Builds early-cue awareness.",
      "Somatic focus may be less accessible for some clients; offer alternatives."
     ],
     [
      "B",
      "If we slowed the scene down, what were you predicting would happen if you said no?",
      "They’d think I was selfish.",
      "Clarifies feared consequences.",
      "Thinking can become more insight without practice."
     ],
     [
      "C",
      "What was the smallest moment when another response might have been possible?",
      "Maybe after they asked but before I smiled.",
      "Locates a precise behavioral pivot.",
      "Could imply easier control than Morgan currently has."
     ]
    ]
   },
   {
    "id": "morgan-03",
    "client": "I know I’m allowed to say no. I just freeze.",
    "choices": [
     [
      "A",
      "Let’s practice a pause first, not the whole boundary. What might one breath and a sentence buy you?",
      "I could say I need to check my workload.",
      "Scales the skill to a feasible first movement.",
      "Check whether a pause is tolerable during activation."
     ],
     [
      "B",
      "What would help you feel safe enough to rehearse this here?",
      "If we start with an easier version.",
      "Collaboratively titrates difficulty.",
      "Do not unintentionally avoid the feared situation forever."
     ],
     [
      "C",
      "When you say ‘freeze,’ what does that mean in that moment—blank mind, numbness, fear, something else?",
      "Blank mind and a huge urge to make them happy.",
      "Clarifies a clinically ambiguous description.",
      "After understanding the experience, transition toward practice."
     ]
    ]
   },
   {
    "id": "morgan-04",
    "client": "Okay, but pretend you’re my coworker. I don’t know what I’d say.",
    "choices": [
     [
      "A",
      "I’ll play them. ‘Could you finish my report tonight?’ Try any response, even a rough first draft.",
      "I can’t tonight—I mean, I need to look at my schedule.",
      "Moves from verbal explanation into action.",
      "Debrief what the client experienced rather than grading fluency."
     ],
     [
      "B",
      "Before role-play, do you want to choose a phrase you could realistically say?",
      "Maybe, ‘Let me get back to you.’",
      "Offers scaffolding and choice.",
      "Too much scripting can replace flexible responding."
     ],
     [
      "C",
      "What version of this role-play would feel challenging enough to learn from but not overwhelming?",
      "Start friendly. My coworker isn’t usually mean.",
      "Calibrates exposure to the actual context.",
      "Must then complete an actual rehearsal, not just plan one."
     ]
    ]
   },
   {
    "id": "morgan-05",
    "client": "That felt fake. I can say it here because you’re nice.",
    "choices": [
     [
      "A",
      "That makes sense. What changes when you picture their actual facial expression?",
      "They sigh and look disappointed. That’s what gets me.",
      "Uses feedback to increase ecological validity.",
      "Watch arousal and readiness before intensifying."
     ],
     [
      "B",
      "Good feedback. Want to redo it with me looking impatient instead?",
      "Ugh, yes. That’s harder.",
      "Adjusts simulation difficulty in response to client feedback.",
      "Avoid escalating intensity without consent and regulation."
     ],
     [
      "C",
      "You’re noticing that the skill is context-dependent. Could we practice just the first five seconds?",
      "I think I can manage five seconds.",
      "Narrows the task to an observable interval.",
      "Keep a line of sight to full real-world behavior."
     ]
    ]
   },
   {
    "id": "morgan-06",
    "client": "I tried it again, but when you frowned I almost apologized.",
    "choices": [
     [
      "A",
      "What helped you not apologize immediately?",
      "I remembered I could wait a second.",
      "Highlights a successful micro-skill.",
      "May overpraise before exploring what still felt hard."
     ],
     [
      "B",
      "Let’s pause at the urge to apologize. What would you want to do next if that urge shows up at work?",
      "Maybe repeat my answer instead of explaining it to death.",
      "Links in-session awareness to an alternative action.",
      "Check the choice remains appropriate for the actual relationship."
     ],
     [
      "C",
      "What did my frown mean to you, and is there another possible reading?",
      "I assumed you were mad. You might just be thinking.",
      "Creates cognitive flexibility.",
      "If it remains purely cognitive, the original insight-action gap persists."
     ]
    ]
   },
   {
    "id": "morgan-07",
    "client": "I’m worried that if I try this at work, I’ll mess it up and spiral all night.",
    "choices": [
     [
      "A",
      "Let’s design a low-stakes version and define success as trying the pause, not getting a perfect response.",
      "I could start when someone asks for a small favor.",
      "Makes practice workable and process-focused.",
      "Still needs a plan for managing rumination afterward."
     ],
     [
      "B",
      "What would you need after the interaction to keep one awkward moment from turning into a verdict about yourself?",
      "A way to review it without tearing myself apart.",
      "Builds post-practice recovery.",
      "Do not let reflection become another elaborate ritual."
     ],
     [
      "C",
      "Would you prefer another role-play today or a small real-world test?",
      "A real-world test, but one I can control.",
      "Offers meaningful options and autonomy.",
      "Rehearsal may still be warranted if confidence or readiness is low."
     ]
    ]
   },
   {
    "id": "morgan-08",
    "client": "We’re nearly out of time. Can we make sure I don’t leave with only an insight again?",
    "choices": [
     [
      "A",
      "Yes. What is your specific experiment, when will you try it, and what will tell us you practiced?",
      "I’ll say ‘Let me check’ once this week and notice how I handle the discomfort.",
      "Closes with behavioral specificity and observable learning.",
      "Ensure it is collaboratively chosen, not a performance assignment."
     ],
     [
      "B",
      "Let’s rehearse your first sentence one more time, then choose how we’ll review it next week.",
      "That would help me remember it.",
      "Uses final minutes for consolidation and follow-through.",
      "Leave enough time for the client’s own takeaway."
     ],
     [
      "C",
      "What changed in here today compared with our usual conversations?",
      "I actually felt what happens when I want to backtrack.",
      "Supports integration of experiential learning.",
      "Pair insight with a concrete next-step commitment before time runs out."
     ]
    ]
   }
  ],
  "debrief": [
   "Where did the conversation change from understanding to doing?",
   "Which in-session adjustment followed actual feedback rather than the therapist’s preset plan?",
   "Write a closing summary that includes one action, one obstacle, and one way to review it next session."
  ]
 },
 "riley": {
  "week": 4,
  "client": "Riley",
  "title": "Is Therapy Even Helping?",
  "skill": "Receive feedback, repair, adjust course, and close with collaboration",
  "setup": "Riley, 27, has attended six sessions for anxiety and interpersonal shutdown. You have used reflection and worksheets. Riley has not reported acute safety concerns. This capstone contains clinically meaningful uncertainty; the goal is a defensible, responsive process rather than a perfect speech.",
  "moments": [
   {
    "id": "riley-01",
    "client": "I keep coming here, and nothing is changing. I don’t know if any of this is helping.",
    "choices": [
     [
      "A",
      "I appreciate you telling me. When you say nothing is changing, what were you hoping would be different by now?",
      "I thought I’d stop shutting down when my partner gets upset.",
      "Receives difficult feedback and clarifies outcome.",
      "A question can feel evasive unless the disappointment is clearly acknowledged."
     ],
     [
      "B",
      "I’m sorry the work hasn’t felt useful. Can we look honestly at what we’ve tried and what’s been missing?",
      "Yes. I don’t want to waste more time.",
      "Shows accountability and invites a treatment review.",
      "Avoid prematurely accepting sole responsibility without understanding context."
     ],
     [
      "C",
      "That’s important feedback. What happens in our sessions that feels helpful, and what doesn’t?",
      "Talking feels good briefly. Then I go home and do exactly the same thing.",
      "Makes the therapeutic process available for examination.",
      "May need a more targeted question about goals and measurable change."
     ]
    ]
   },
   {
    "id": "riley-02",
    "client": "We have good conversations, but I leave here and still freeze during arguments.",
    "choices": [
     [
      "A",
      "What is the last moment you remember before you shut down?",
      "My partner raises their voice and I feel like I disappear.",
      "Locates a clinically useful action point.",
      "Assess relational safety and intensity rather than assuming a skills deficit."
     ],
     [
      "B",
      "It sounds like relief in session isn’t translating into something you can use under stress.",
      "Exactly. I understand myself. I still can’t do it.",
      "Validates the insight-application gap.",
      "Needs a different method, not just naming the gap."
     ],
     [
      "C",
      "Would it be worth reviewing whether our current approach matches what you need?",
      "Yes, because I’m not sure worksheets are it.",
      "Opens a collaborative treatment-fit conversation.",
      "Do not jump to a new technique without listening to the specific feedback."
     ]
    ]
   },
   {
    "id": "riley-03",
    "client": "When you give me another worksheet, it feels like you haven’t heard what I’m saying.",
    "choices": [
     [
      "A",
      "I’m glad you said that. I can see how another worksheet could feel dismissive. What did you most need from me in those moments?",
      "I needed help with the actual conversation, not another list.",
      "Acknowledges relational impact and seeks a repair.",
      "Do not make Riley responsible for reassuring the therapist."
     ],
     [
      "B",
      "You’re right that we need something more practical. Could we practice a real interaction instead?",
      "Maybe, but I’m worried you’ll make me do something I can’t.",
      "Offers concrete change and invites concern.",
      "Fast problem-solving might skip the hurt of not feeling heard."
     ],
     [
      "C",
      "I want to understand what I missed. Was it the assignment itself, the timing, or how I introduced it?",
      "The timing. I’d just told you how overwhelmed I felt.",
      "Seeks specific process feedback.",
      "Too many options can lead the client; remain open to other answers."
     ]
    ]
   },
   {
    "id": "riley-04",
    "client": "I’m juggling work and family. Homework turns into one more thing I’m failing at.",
    "choices": [
     [
      "A",
      "Then adding another task may be the wrong fit right now. What would useful work inside the session look like?",
      "I’d like help with what to say when I freeze.",
      "Adapts expectations to capacity.",
      "In-session practice still needs readiness and collaboration."
     ],
     [
      "B",
      "When tasks become another measure of failure, that matters. Can we redesign the work so it doesn’t add pressure?",
      "Maybe something tiny, or no homework for a while.",
      "Responds to burden and client preference.",
      "Do not assume all between-session work is unhelpful."
     ],
     [
      "C",
      "How can we tell whether a session is useful without relying on whether you completed an assignment?",
      "If I leave knowing what to try in an actual situation.",
      "Builds collaboratively meaningful outcome indicators.",
      "An actionable idea alone does not guarantee change; review its fit and effect."
     ]
    ]
   },
   {
    "id": "riley-05",
    "client": "Actually, I’m not sure my partner is safe to disagree with. They yell and sometimes throw things.",
    "choices": [
     [
      "A",
      "Thank you for telling me. Throwing things raises concern about safety. Are you safe now, and has anyone been hurt or threatened?",
      "I’m safe now, but once they threw a mug near me.",
      "Shifts promptly to immediate safety assessment and violence risk.",
      "A plan for assertiveness must not outrank safety; assess context and offer appropriate resources."
     ],
     [
      "B",
      "That changes what we need to focus on. Before practicing disagreement, I’d like to understand what happens when objects are thrown and whether you can leave safely.",
      "Sometimes they block the hallway. I hadn’t told anyone.",
      "Reprioritizes away from unsafe skills rehearsal.",
      "Follow up with direct assessment of immediacy, escalation, and support."
     ],
     [
      "C",
      "I’m concerned about what you’re describing. Can we talk about what helps you stay safe, rather than rehearsing a confrontation today?",
      "Yes. I’m relieved you’re not telling me to just speak up.",
      "Makes a safety-oriented pivot explicit.",
      "Ensure a specific safety assessment, plan, and appropriate consultation or referral."
     ]
    ]
   },
   {
    "id": "riley-06",
    "client": "I don’t want to leave the relationship today. I just want to know you’re not going to push me.",
    "choices": [
     [
      "A",
      "I won’t decide that for you. We can make room for your choices while taking the safety concerns seriously.",
      "Okay. That feels less overwhelming.",
      "Protects autonomy while remaining clinically direct.",
      "Assess risk and available supports; avoid promising a specific outcome."
     ],
     [
      "B",
      "What options for support would feel possible without increasing risk for you?",
      "My cousin knows some of it, but I worry my partner checks my messages.",
      "Invites feasible support planning and surfaces privacy risk.",
      "Explore safe communication and device privacy before encouraging contact."
     ],
     [
      "C",
      "We can separate a relationship decision from a safety plan. Would working on the second feel useful today?",
      "Yes. I could do that.",
      "Reduces an all-or-nothing dilemma.",
      "Do not assume safety planning is complete without specific practical details."
     ]
    ]
   },
   {
    "id": "riley-07",
    "client": "I’m angry I spent weeks thinking I just needed to communicate better.",
    "choices": [
     [
      "A",
      "That makes sense to talk about. I should have made more room to understand the context. What would repair look like from me?",
      "I want you to ask more about what’s happening before giving me something to do.",
      "Takes responsibility for the process and solicits repair.",
      "Do not overstate what you could have known before disclosure."
     ],
     [
      "B",
      "I hear how frustrating that has been. I want us to update our understanding together rather than keep treating this as a simple communication skill.",
      "I’d like that. It feels more accurate.",
      "Shows visible clinical recalibration.",
      "Need an explicit next-step plan and safety follow-through."
     ],
     [
      "C",
      "Can I reflect what I think we missed, and you tell me what fits and what doesn’t?",
      "Yes. I want you to actually check with me.",
      "Makes formulation collaborative and corrigible.",
      "Do not let a neat summary replace acknowledgment of the rupture."
     ]
    ]
   },
   {
    "id": "riley-08",
    "client": "I don’t know whether therapy will work, but I’m willing to try again if we do it differently.",
    "choices": [
     [
      "A",
      "Let’s name what we’ll change, how we’ll check whether it helps, and what support will be available if safety concerns escalate.",
      "I want us to review how safe I feel and whether sessions are helping.",
      "Builds a transparent revised plan without promising success.",
      "Clarify relevant resources, consultation, and follow-up consistent with setting."
     ],
     [
      "B",
      "Before we finish, what should I do differently next time so you can tell I took this feedback seriously?",
      "Ask me what I need and don’t jump to another worksheet.",
      "Turns feedback into a specific therapist behavior.",
      "Also ensure safety assessment and planning are completed."
     ],
     [
      "C",
      "I’m glad you told me the hard parts. Would you like to summarize what feels worth keeping and what needs to change?",
      "I want to keep talking, but I need us to focus on safety and real situations.",
      "Centers client choice and treatment alignment.",
      "Do not end on a positive note alone; agree on concrete responsibilities."
     ]
    ]
   }
  ],
  "debrief": [
   "At what point did you revise your case formulation?",
   "Which choice demonstrated repair without becoming defensive or overly apologetic?",
   "Draft a final 30-second closing that acknowledges feedback, names the safety concern, and makes a collaborative plan without guaranteeing therapy will work."
  ]
 }
};
