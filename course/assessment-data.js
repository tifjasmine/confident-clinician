const confidenceItems = [
  "I can notice when my confidence drops without treating the feeling as proof that I am failing.",
  "I can identify whether I need knowledge, practice, judgment, regulation, context change, or support.",
  "I can notice when a personal pattern is shaping my clinical behavior.",
  "When I feel evaluated, I can return my attention to the client and the clinical information.",
  "I can take a responsible action before I feel completely certain.",
  "I can identify the main clinical thread of a session.",
  "I can decide what matters most when several possible interventions could fit.",
  "I can choose an intervention based on its clinical purpose.",
  "I can explain my reasoning while recognizing that another response may also be responsible.",
  "I can use the client's response as information and change direction when needed.",
  "I can collaboratively establish a useful focus early in a session.",
  "I can connect a topic to a meaningful treatment target.",
  "I can redirect without apologizing for protecting the work.",
  "I can speak clearly in language that sounds natural to me.",
  "I can close a session with enough time for integration and containment.",
  "I can reflect on a difficult session without turning review into self punishment.",
  "I can distinguish responsibility, influence, control, and shared support.",
  "I can notice when helping is becoming rescuing or overfunctioning.",
  "I can prepare for repair without collapsing, defending, or demanding reassurance.",
  "I know when to consult, document, coordinate, refer, or use another support pathway.",
];

const interferenceItems = [
  "I overprepare because I am afraid I will not know what to do.",
  "I ask another question quickly because silence makes me uncomfortable.",
  "I reach for a worksheet or technique mainly because I feel stuck.",
  "I take excessive responsibility for whether the client changes.",
  "I avoid redirecting even when the session has lost direction.",
  "I soften or avoid clinically useful feedback because I am afraid the client will dislike me.",
  "I mentally replay sessions long after work ends.",
  "I compare myself to more experienced clinicians and assume they always know exactly what to say.",
  "I confuse feeling anxious with practicing badly.",
  "I leave a session without a clear idea of what I am tracking next.",
];

const confidenceDomains = ["Therapist Self Awareness", "Clinical Reasoning", "Session Leadership", "Responsibility and Repair"];
const ratingFields = (prefix = "", includeSections = false) => {
  const fields = [];
  confidenceItems.forEach((label, index) => {
    if (includeSections && index % 5 === 0) fields.push({ type: "section", title: confidenceDomains[index / 5] });
    fields.push({ key: `${prefix}confidence-${index + 1}`, label, type: "rating", min: 0, max: 10, help: "0 means not at all true. 10 means consistently true." });
  });
  if (includeSections) fields.push({ type: "section", title: "Clinical Interference Patterns", description: "Think about how often each pattern has happened in the last 30 days." });
  interferenceItems.forEach((label, index) => fields.push({ key: `${prefix}interference-${index + 1}`, label, type: "rating", min: 1, max: 5, help: "1 means never. 5 means almost every session." }));
  return fields;
};

const pulseCore = [
  { key: "grounded", label: "This week, I could access what I knew even when I felt activated.", type: "rating", min: 0, max: 10 },
  { key: "structure", label: "This week, I gave sessions enough structure without becoming rigid.", type: "rating", min: 0, max: 10 },
  { key: "intentional", label: "This week, I chose at least one response intentionally rather than reactively.", type: "rating", min: 0, max: 10 },
  { key: "recovery", label: "This week, I reflected on sessions without spiraling afterward.", type: "rating", min: 0, max: 10 },
  { key: "lesson-tool", label: "I completed the lesson and tool.", type: "choice", options: ["Yes", "Partly", "No"] },
  { key: "practice", label: "I practiced the weekly skill in a real or fictional case.", type: "choice", options: ["Yes", "Partly", "No"] },
  { key: "win", label: "One specific win from this week", type: "text" },
  { key: "stuck", label: "One moment I still got stuck", type: "text" },
  { key: "support", label: "What support would be most useful next week?", type: "text" },
];

const pulseSpecific = [
  "Choose one confidence drop. What kind of difficulty was it, what personal or protective pattern appeared, and what developmental practice fits it?",
  "Use CLEAR with one messy clinical moment. What did you notice, prioritize, choose, and learn from the client's response?",
  "Choose one session. How did you create focus, make a clinical pivot, redirect, create movement, or close with intention?",
  "Choose one difficult session. What belongs to reflection, responsibility, repair, support, and release?",
];

window.TCC_LAB_FORMS = {
  baseline: {
    title: "Baseline Clinical Confidence Assessment",
    eyebrow: "Orientation",
    description: "Answer from how you have actually practiced during the last 30 days. This is for learning and program improvement. It is not a test of competence.",
    fields: [
      { type: "section", title: "About Your Current Clinical Work", description: "Tell me a little about your work so I can understand the context you are practicing in." },
      { key: "full-name", label: "Full name", type: "shortText" },
      { key: "preferred-name", label: "Preferred name", type: "shortText" },
      { key: "email", label: "Email", type: "shortText" },
      { key: "role-credentials", label: "Role and credentials", type: "shortText" },
      { key: "work-setting", label: "Work setting", type: "shortText" },
      { key: "states-practice", label: "State or states of practice", type: "shortText" },
      { key: "years-service", label: "Years in direct service", type: "shortText" },
      { key: "caseload", label: "Approximate caseload", type: "shortText" },
      { key: "populations", label: "Primary populations", type: "shortText" },
      { key: "supervision", label: "Current supervision or consultation structure", type: "shortText" },
      { type: "sectionTitle", title: "Clinical Confidence Ratings", description: "Rate each statement based on your actual experience, including challenging sessions." },
      ...ratingFields("", true),
      { type: "section", title: "Real Life Clinical Situations", description: "There are no trick questions. Share what you would most likely do next using general clinical reasoning and no identifying client information." },
      { key: "quiet-scenario", label: "Scenario 1: The quiet session", help: "A client answers several questions with ‘I don’t know,’ looks down, and becomes increasingly quiet. What do you notice? What might matter clinically? What would you do or say next, and why?", type: "text" },
      { key: "everything-scenario", label: "Scenario 2: The everything session", help: "A client brings several important concerns in the first fifteen minutes. What thread would you listen for? How might you create focus without dismissing what they brought?", type: "text" },
      { key: "carry-home-scenario", label: "Scenario 3: The session you carry home", help: "A client appears disappointed after you set a boundary. What belongs to reflection? What belongs in consultation? What would help you close the loop?", type: "text" },
      { type: "section", title: "Your Current Confidence Goal" },
      { key: "confidence-drop", label: "What is the most common moment in session when your confidence drops?", type: "text" },
      { key: "usual-response", label: "What do you usually do when that happens?", type: "text" },
      { key: "desired-change", label: "What would you like to do differently by the end of four weeks?", type: "text" },
      { key: "useful-proof", label: "How would you know this program was genuinely useful and not just interesting?", type: "text" },
      { key: "guidance-context", label: "Anything about your current role, training level, or support system Tiffany should know to guide you responsibly?", type: "text" },
    ],
  },
  "success-plan": {
    title: "Emerging Clinician Starting Plan",
    eyebrow: "Orientation",
    description: "Choose the clinician qualities and visible behaviors you want to practice during the Lab.",
    fields: [
      { key: "qualities", label: "What three qualities do I want clients to consistently experience from me?", type: "text" },
      { key: "behavior-1", label: "One observable behavior that would express the first quality", type: "text" },
      { key: "behavior-2", label: "One observable behavior that would express the second quality", type: "text" },
      { key: "behavior-3", label: "One observable behavior that would express the third quality", type: "text" },
      { key: "main-edge", label: "The clinical moment I most want to practice with", type: "text" },
      { key: "protective-pattern", label: "The protective pattern I want to notice earlier", type: "text" },
      { key: "evidence", label: "What evidence will show me I am becoming this clinician?", type: "text" },
      { key: "formal-support", label: "The supervision, consultation, or workplace support pathway I will use when needed", type: "text" },
      { key: "scope-ack", label: "I agree to use deidentified or fictional material and formal support for risk, ethics, law, scope, competence, or workplace policy.", type: "acknowledgement" },
    ],
  },
  ...Object.fromEntries(pulseSpecific.map((specific, index) => [`pulse-${index + 1}`, {
    title: `Week ${index + 1} Pulse Check`,
    eyebrow: `End of Week ${index + 1}`,
    description: "A short check in to make your progress visible.",
    week: index + 1,
    fields: [...pulseCore, { key: "week-specific", label: specific, type: "text" }],
  }])),
  post: {
    title: "Post-Program Clinical Confidence Assessment",
    eyebrow: "After Week 4",
    description: "Repeat the same four capability areas so you can compare your process before and after the Lab. This is not a test of competence.",
    week: 4,
    fields: [
      ...ratingFields("post-"),
      { key: "different-now", label: "What changed most in how you think during sessions?", type: "text" },
      { key: "handled-uncertainty", label: "What do you now do differently when you feel stuck?", type: "text" },
      { key: "trusted-behavior", label: "What clinical behavior do you trust yourself with more?", type: "text" },
      { key: "development-edge", label: "What remains a developmental edge?", type: "text" },
      { key: "trust-evidence", label: "What evidence shows that you are becoming a more trustworthy clinician?", type: "text" },
      { key: "useful", label: "The program gave me a process I can actually use.", type: "rating", min: 1, max: 5 },
      { key: "valuable", label: "The most valuable part was…", type: "text" },
      { key: "improve", label: "The part that needs improvement is…", type: "text" },
    ],
  },
  capstone: {
    title: "Case Based Clinical Reasoning Assessment",
    eyebrow: "After Week 4",
    description: "Use the fictional case provided. Show how you notice, reason, choose, and identify when another support pathway is needed.",
    week: 4,
    fields: [
      { key: "notice", label: "What do you notice in the case?", type: "text" },
      { key: "unknown", label: "What do you not yet know?", type: "text" },
      { key: "threads", label: "What possible clinical threads do you hear?", type: "text" },
      { key: "priority", label: "What is the immediate priority, and why?", type: "text" },
      { key: "options", label: "What are two or three reasonable next moves?", type: "text" },
      { key: "choice", label: "Which response would you choose now, and what is its clinical purpose?", type: "text" },
      { key: "watch", label: "What client response or new information would make you continue or change direction?", type: "text" },
      { key: "support-path", label: "What would require consultation, documentation, coordination, referral, policy review, or another support pathway?", type: "text" },
      { key: "deidentify-ack", label: "I confirm that this submission contains no identifying client information.", type: "acknowledgement" },
    ],
  },
  "call-prep": {
    title: "Private Completion Session Prep",
    eyebrow: "After Week 4",
    description: "Bring one pattern, one question, and one useful next step. You do not need to bring an entire caseload.",
    week: 4,
    fields: [
      { key: "skill-used", label: "What skill have you used most since the program began?", type: "text" },
      { key: "situation", label: "Describe one fully deidentified situation where you used it.", type: "text" },
      { key: "better", label: "What went better than your old pattern?", type: "text" },
      { key: "confusing", label: "What still felt confusing or uncomfortable?", type: "text" },
      { key: "support", label: "What feedback, practice, or decision support would help?", type: "text" },
      { key: "next-behavior", label: "What repeatable behavior do you want to keep practicing?", type: "text" },
      { key: "scope-ack", label: "I confirm that any client material is fully deidentified and this session is educational mentorship. It is not clinical supervision or emergency consultation.", type: "acknowledgement" },
    ],
  },
};
