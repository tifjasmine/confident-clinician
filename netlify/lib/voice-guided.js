/* Guided voice session scripts (DRAFT clinical content: awaiting Tiffany's review).
   Each moment: the client's line (written to follow ANY earlier reply), the course skill + on-screen focus,
   and several pre-written replies, each matched to a common trainee move. The practice partner only picks
   which reply fits best. "land" = how it landed: open (opened up), guarded (stayed where she was), pull (pulled back). */
module.exports = {
  dana: {
    client: "Dana", voice: "aura-2-thalia-en",
    intro: "Dana, 34, is an ER nurse in session 6. Last week you suggested a thought record. She didn’t do it, and she walks in guarded.",
    goal: "Find out what really got in the way of the homework, without assigning anything new.",
    stretch: "Dana shares what she’s afraid would happen if she slipped at work.",
    moments: [
      { skill: "Use her words", hint: "Be curious about the word “everyone.” Who does she mean, and what’s that like?", focus: "Try using one of her exact words.",
        line: "Honestly? I think you don’t understand me either. Everyone just keeps giving me homework.",
        replies: [
          { key: "echo", land: "open", when: "reflects or repeats her own words (everyone, homework, don’t understand), or asks what she means by “everyone”", text: "Yeah. Everyone. My manager, my mom… it’s like everybody has a plan for me." },
          { key: "feel", land: "open", when: "asks how she feels, what that’s like, or what “not understanding” means to her", text: "Tired, mostly. Like I’m being managed instead of… helped." },
          { key: "detail", land: "guarded", when: "asks about the homework itself: what kind, what it was, or why she didn’t do it", text: "The thought record. Write the thought, rate it, find the evidence… I just didn’t get to it." },
          { key: "defend", land: "pull", when: "defends the homework, explains why it matters, or apologizes a lot", text: "Right. I know it’s supposed to help. I just didn’t do it, okay?" },
          { key: "other", land: "guarded", when: "anything else", text: "I don’t know. I’m just tired, I guess." }
        ] },
      { skill: "Notice your Pull", hint: "Notice your urge to defend the homework. You can say what you will and won’t do, then turn toward her.", focus: "She’s testing you. Notice the urge to fix or defend, then answer anyway.",
        line: "So… are you going to give me another worksheet now?",
        replies: [
          { key: "noassign", land: "open", when: "says no or not today, honestly, and turns toward curiosity about her", text: "…Okay. That’s kind of a relief, honestly." },
          { key: "choice", land: "guarded", when: "says only if she wants one, or asks whether she wants one", text: "I mean… I don’t know. I guess if you think I need one." },
          { key: "assign", land: "pull", when: "says yes, defends the homework, offers an easier or different worksheet, or explains how it works", text: "See, that’s what I mean. There’s always something to fix." },
          { key: "reassure", land: "guarded", when: "reassures her it’s fine or no big deal, without curiosity", text: "Okay. Sure." },
          { key: "other", land: "guarded", when: "anything else", text: "Mm. That’s usually how it goes." }
        ] },
      { skill: "Explore before explaining", hint: "Ask what it’s like to get those articles, before you say anything about sleep.", focus: "Get curious before you explain anything.",
        line: "It’s not just here, honestly. My mom sent me another article this week. About sleep. Like I don’t know I’m not sleeping.",
        replies: [
          { key: "curious", land: "open", when: "asks about her experience: what it’s like getting those articles, or what she wishes her mom did instead", text: "It’s like… everyone can see I’m struggling, and the answer is always a link. Nobody just asks how I’m doing." },
          { key: "name", land: "guarded", when: "names a feeling for her as a check (sounds frustrating? is that true?)", text: "I mean… yeah, kind of. She means well, though." },
          { key: "advice", land: "pull", when: "gives sleep advice or explains why sleep matters", text: "Yeah. I know all that. I’m a nurse." },
          { key: "defendmom", land: "pull", when: "defends her mom or says her mom is just trying to help", text: "Sure. I know she’s trying." },
          { key: "other", land: "guarded", when: "anything else", text: "It’s fine. She means well." }
        ] },
      { skill: "Leave room to be corrected", hint: "Offer a guess she can easily correct, like “I wonder if…,” and check whether it fits.", focus: "Offer what you’re noticing, and make it easy for her to disagree.",
        line: "I don’t know. Sometimes I think I’m just bad at this whole therapy thing.",
        replies: [
          { key: "tentative", land: "open", when: "offers a tentative observation she could disagree with (I wonder…, does that fit?), or asks what “bad at this” means to her", text: "Maybe not bad. Maybe… tired of being graded." },
          { key: "insist", land: "pull", when: "insists she isn’t bad at it, or over-reassures", text: "You kind of have to say that. It’s your job." },
          { key: "redirect", land: "pull", when: "skips what she just said and goes back to the homework or another topic", text: "…Right. The homework. I don’t know what else to tell you." },
          { key: "interpret", land: "pull", when: "states an interpretation of her as fact (you’re avoiding…, you’re afraid of…)", text: "That’s not really it." },
          { key: "other", land: "guarded", when: "anything else", text: "I don’t know. Maybe." }
        ] },
      { skill: "Say one intentional thing", hint: "Pick one thing she said, like “it’s on me,” and ask one question about it.", focus: "Ask one question you really want answered. Just one.",
        line: "It’s like work. Every step has a checklist, and if I miss one, it’s on me.",
        replies: [
          { key: "one", land: "open", when: "asks ONE clear, curious question or makes one reflection about the pressure, or about what missing one would mean", text: "…If I miss something, someone could get hurt. That’s what I’m thinking about at two in the morning. Not the worksheet." },
          { key: "stack", land: "pull", when: "asks several questions at once", text: "Which one do you want me to answer first?" },
          { key: "fix", land: "pull", when: "gives advice, problem-solves the checklists, or brings it back to homework logistics", text: "I’m not really looking for a plan right now." },
          { key: "reassure", land: "guarded", when: "reassures her or says everyone feels that way", text: "That’s just the job." },
          { key: "other", land: "guarded", when: "anything else", text: "It’s just a lot of pressure. Everybody has it." }
        ] }
    ],
    closings: { warm: "I didn’t expect to say all that. Thanks for not handing me something.", flat: "Okay. I guess that’s where things are." }
  }
};
