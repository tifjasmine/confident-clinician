/* Guided voice session scripts (DRAFT clinical content: awaiting Tiffany's review).
   Each moment: the client's line, the course skill + on-screen focus, and three pre-written replies.
   The practice partner only picks which reply fits what the trainee said: "open", "guarded" or "pull". */
module.exports = {
  dana: {
    client: "Dana", voice: "aura-2-thalia-en",
    intro: "Dana, 34, is an ER nurse in session 6. Last week you suggested a thought record. She didn’t do it, and she walks in guarded.",
    goal: "Find out what really got in the way of the homework, without assigning anything new.",
    stretch: "Dana shares what she’s afraid would happen if she slipped at work.",
    moments: [
      { skill: "Use her words", focus: "Try using one of her exact words.",
        line: "Honestly? I think you don’t understand me either. Everyone just keeps giving me homework.",
        open: "reflects or repeats her own words (everyone, homework, don’t understand) with curiosity or warmth",
        pull: "defends the homework, explains why it matters, apologizes a lot, or rushes to reassure",
        replies: { open: "Yeah. Everyone. My manager, my mom… it’s like everybody has a plan for me.", guarded: "I don’t know. I just didn’t get to it.", pull: "Right. I know it’s supposed to help. I just didn’t do it, okay?" } },
      { skill: "Notice your Pull", focus: "She’s testing you. Notice the urge to fix or defend, then answer anyway.",
        line: "So are you going to give me another worksheet now?",
        open: "answers honestly without defending or re-assigning, and gets curious about her",
        pull: "defends the homework, promises a different or easier worksheet, explains the method, or over-reassures",
        replies: { open: "…Okay. That’s kind of a relief, honestly.", guarded: "I mean, that’s usually how it goes.", pull: "See, that’s what I mean. There’s always something to fix." } },
      { skill: "Explore before explaining", focus: "Get curious before you explain anything.",
        line: "My mom sent me another article this week. About sleep. Like I don’t know I’m not sleeping.",
        open: "asks about her experience or what that was like, without giving information",
        pull: "explains sleep hygiene, gives advice, or defends her mom",
        replies: { open: "It’s like… everyone can see I’m struggling, and the answer is always a link. Nobody just asks how I’m doing.", guarded: "It’s fine. She means well.", pull: "Yeah. I know all that. I’m a nurse." } },
      { skill: "Leave room to be corrected", focus: "Offer what you’re noticing, and make it easy for her to disagree.",
        line: "I don’t know. Maybe I’m just bad at this whole therapy thing.",
        open: "offers a tentative observation she could disagree with (I wonder…, does that fit?), or gets curious about what “bad at this” means",
        pull: "insists she isn’t bad at it, over-reassures, or states an interpretation as fact",
        replies: { open: "Maybe not bad. Maybe… tired of being graded.", guarded: "I don’t know. Maybe.", pull: "You kind of have to say that. It’s your job." } },
      { skill: "Say one intentional thing", focus: "Ask one question you really want answered. Just one.",
        line: "Work’s the same. Every step has a checklist, and if I miss one, it’s on me.",
        open: "asks one clear, curious question or makes one reflection about the pressure or what missing one would mean",
        pull: "stacks several questions, gives advice, or problem-solves the checklists",
        replies: { open: "…If I miss something, someone could get hurt. That’s what I’m thinking about at two in the morning. Not the worksheet.", guarded: "It’s just a lot of pressure. Everybody has it.", pull: "Which one do you want me to answer first?" } }
    ],
    closings: { warm: "I didn’t expect to say all that. Thanks for not handing me something.", flat: "Okay. I guess that’s where things are." }
  }
};
