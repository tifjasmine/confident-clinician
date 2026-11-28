/* Clinical Confidence Lab: Bonus Reps (Rep Room). Six extra Reps, each in a different format.
   DRAFT clinical content: awaiting Tiffany's review. Audio: when /course/audio/bonus/<code>.mp3 exists, add the code to audioReady. */
window.TCC6_BONUS_AUDIO = { base: "/course/audio/bonus/", ready: [] };
window.TCC6_BONUS = [
  {
    id: "taylor", format: "listen", icon: "🎧", fmtLabel: "Listen first", client: "Taylor", age: 16, setting: "School counseling",
    sub: "Hear it before you read it. Tone changes what you say.",
    context: "Taylor, 16, first meeting in the school counselor’s office. Taylor’s mom called the school after Taylor’s grades dropped this semester.",
    audio: ["taylor-01"], delivery: "Arms crossed, half-laughing, not looking at you.",
    line: "This is stupid. I’m only here because my mom made me.",
    hearQ: "What did you hear in how Taylor said it?", hearOpts: ["Annoyed", "Embarrassed", "Testing me", "Nervous", "Not sure"],
    hearNote: "There’s rarely just one. A protest can be annoyed and embarrassed at the same time. What you hear shapes your tone more than your words.",
    guide: "If the therapist pushes past the protest or tries to sell counseling, Taylor checks out: “Whatever.” If they just agree it’s unfair, Taylor asks if they can leave. If they get curious about what Mom thinks is going on, Taylor gives a little: “That I’m ‘not myself.’ Like she’d know.” If they honestly name that Taylor didn’t choose this, Taylor softens slightly.",
    take: { pull: "Prove", text: "A common pull here is Prove: convince Taylor this will be worth it, or win them over fast. But the protest is information. Taylor didn’t choose to be here, and saying so out loud is honest.",
      say: "You didn’t pick this, and I’m not going to pretend you did. Since we’ve got the time anyway, what do you think your mom is worried about?",
      watch: "how Taylor talks about Mom. There’s a relationship in that sentence, not just a referral." },
    bank: "When a client says they don’t want to be here, I can say"
  },
  {
    id: "mo", format: "tones", icon: "🎧", fmtLabel: "Same words, two tones", client: "Mo", age: 52, setting: "Hospital",
    sub: "One line, said two ways. Notice how your answer changes.",
    context: "Mo, 52, in the hospital two days after a heart attack. The medical team asked you to check in because he’s been joking about everything.",
    line: "Guess I finally got that vacation my wife keeps nagging me about, huh?",
    tones: [["mo-laugh", "Version 1", "Laughing, a little too loud."], ["mo-flat", "Version 2", "Flat and tired, looking at the window."]],
    compare: "Same words, different invitations. When Mo laughs, the joke may be how he’s coping, so you can smile with him and still leave a door open. When it’s flat, the joke is thinner, and it may be time to gently name what’s underneath.",
    guide: "If the therapist only laughs along, Mo keeps joking and changes the subject. If they gently leave room (“and I imagine it’s been scary too”), Mo admits a little: “Scared my kids, that’s for sure.” If they jump straight to a checklist of symptoms, he gets short. Humor is how he copes; he softens when it isn’t taken away from him.",
    take: { pull: "Fill", text: "A common pull here is Fill: laugh along so the moment stays comfortable. Humor can be how Mo copes, so you don’t need to take it away. You can smile and still leave room for what’s under it.",
      say: "That’s one way to get a vacation. I imagine the last couple of days have been pretty scary, too.",
      watch: "who he mentions. “My wife keeps nagging me” may say more about who’s worried, and how he feels about that, than the joke does." },
    bank: "When a client jokes about something serious, I can say"
  },
  {
    id: "casey", format: "rank", icon: "🔢", fmtLabel: "Rank it", client: "Casey", age: 41, setting: "Couples session",
    sub: "Put four responses in order, from best fit to least.",
    context: "Casey, 41, and her husband Rob, couples session 2. They’ve been arguing about how late Rob works. Casey turns to you.",
    line: "Can you please tell him he’s being unreasonable? You heard him.",
    options: [
      ["I don’t want to pick a side, because I think you both matter here. Casey, what do you most want Rob to understand?", "Stays neutral out loud and turns her frustration into something Rob can actually hear."],
      ["It sounds like you’ve been carrying a lot at home, and you’re worn out.", "Warm and accurate. But said right after her request, Rob may hear it as you agreeing. Strong once both feel heard."],
      ["Rob, what’s it like to hear Casey say that?", "Brings Rob in, which matters. But it skips her question, so she may feel brushed off."],
      ["I can see why you’d feel that way. Working late every night is a lot.", "Understandable, but it leans toward a verdict. Rob may stop talking for the rest of the session."]
    ],
    take: { pull: "Rescue", text: "A common pull here is Rescue: side with whoever is hurting most in the moment. In couples work, taking a side usually costs you the other partner. Your client is the relationship, and the pattern between them.",
      say: "I don’t want to pick a side, because I think you both matter here. Casey, what do you most want Rob to understand?",
      watch: "“You heard him.” She’s asking you to be a witness. You can witness her frustration without handing down a verdict." },
    bank: "When a client asks me to take their side, I can say"
  },
  {
    id: "june", format: "fix", icon: "✏️", fmtLabel: "Fix the line", client: "June", age: 29, setting: "Private practice",
    sub: "A real-sounding response that could go further. Rewrite it.",
    context: "June, 29, private practice, session 5. She’s seen three other therapists in the past two years.",
    line: "Honestly, you’re the best therapist I’ve had. The last three just didn’t get it.",
    original: "Thank you, that means a lot. I’m really glad you found someone who gets you.",
    originalNote: "Kind and natural, and accepting a compliment is fine. But “someone who gets you” quietly agrees with her story about the other three before you know what happened there.",
    guide: "If the therapist just accepts the compliment, June warmly agrees and moves on. If they get curious about the other three, June shares: “They were fine at first. Then I always ended up feeling like too much.” If they notice the pattern gently, she pauses: “Huh. I guess that happens a lot.”",
    take: { pull: "Prove", text: "A common pull here is Prove: it feels good, and it confirms you’re good at this. You can accept a compliment. But “the last three just didn’t get it” is also information about how June’s relationships tend to go.",
      say: "Thank you, I’m glad this has felt helpful. I’m also curious about the other three. What made those not work for you?",
      watch: "the word “just.” If feeling misunderstood is part of her pattern, it could happen here too. Better to be curious about it now." },
    bank: "When a client compares me to their past therapists, I can say"
  },
  {
    id: "deshawn", format: "spot", icon: "🔍", fmtLabel: "Spot the Pull", client: "Deshawn", age: 35, setting: "Employee assistance, telehealth",
    sub: "Three therapists, three responses. Which Pull drove each one?",
    context: "Deshawn, 35, employee assistance program, telehealth, session 2. He’s the only Black engineer on his team and has been describing stress at work.",
    line: "No offense, but I don’t know if you’ll get this part.",
    responses: [
      ["Oh, I get it. I’ve worked with a lot of people in tech.", "Prove", "Reaching for experience to show you’re qualified. It answers your worry about being competent more than his worry about being understood."],
      ["I hear you. I really try to be aware of these things in my work.", "Defend", "Explaining yourself so he knows you’re one of the good ones. The focus shifts onto you."],
      ["That’s okay. Let’s focus on what we can do about the stress at work.", "Fix", "Moving to the solvable part. It skips what he just named about the two of you."]
    ],
    guide: "If the therapist insists they understand, Deshawn says “Okay” and gets more formal. If they move straight to work stress, he goes along but shares less. If they get curious about what he’s worried they’ll miss, he opens up: having to be twice as good and still getting called “intense” in reviews. If they honestly acknowledge they haven’t lived his experience, he relaxes: “Thanks for not pretending.”",
    take: { pull: "Defend", text: "A common pull here is Defend: insist you understand, or show you’re on his side. But he’s telling you something real about the room. You won’t know his experience from the inside, and saying so builds trust.",
      say: "No offense taken. You’re right that I haven’t lived what you’re living, and I want to understand it. What’s the part you’re worried I’ll miss?",
      watch: "“this part.” He’s deciding what to share. Your response decides whether he shares the rest." },
    bank: "When a client wonders if I’ll understand their experience, I can say"
  },
  {
    id: "lena", format: "clock", icon: "⏱️", fmtLabel: "Beat the clock", client: "Lena", age: 44, setting: "Telehealth",
    sub: "Fifteen seconds, like a real session. Then a calmer second try.", seconds: 15,
    context: "Lena, 44, private practice, telehealth, session 8. She’s been working on loneliness since her divorce. She starts the session smiling.",
    line: "Oh! I found your Instagram and followed you. Hope that’s okay!",
    guide: "If the therapist says it’s fine and moves on, Lena happily mentions a photo she saw. If they lead with a policy, she apologizes and goes quiet. If they’re warm and then clear, she takes it well: “That makes sense, I’ll unfollow.” If they get curious about why she looked them up, she shares she wanted to know they’re a real person, because everyone else feels far away.",
    take: { pull: "Rescue", text: "A common pull here is Rescue: say it’s fine so Lena doesn’t feel embarrassed. But a fuzzy boundary now gets harder later. You can be warm and clear, then get curious about what it means.",
      say: "I’m glad you told me. I keep my social media separate from my work, so I won’t follow back, and I’d ask you to unfollow. I’m also curious what made you want to look me up.",
      watch: "embarrassment. If she apologizes, the boundary isn’t the problem. What she makes it mean about herself is." },
    bank: "When a client finds me on social media, I can say"
  }
];
