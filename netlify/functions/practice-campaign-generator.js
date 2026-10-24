const campaignSchema = {
  type: "object",
  additionalProperties: false,
  required: ["exercise", "promotion"],
  properties: {
    exercise: {
      type: "object",
      additionalProperties: false,
      required: ["type", "title", "slug", "category", "summary", "clientStatement", "therapistResponse", "caseScenario", "reflectionQuestion", "hint", "clinicalConsideration", "clinicalConsiderationExplanation", "therapistIntention", "clinicalPoints", "choices", "alternatives", "preferredStartingPoint", "biggerLesson", "nuance", "practicalApplication", "reflectionPrompts", "seoDescription", "roundTwoEnabled", "roundTwoClientResponse", "roundTwoQuestion", "roundTwoAnswerFormat", "roundTwoChoices", "roundTwoBreakdown", "whatChangedBetweenDecisions"],
      properties: {
        type: { type: "string", enum: ["The Clinical Response Check", "Clinical Case Lab"] },
        title: { type: "string" }, slug: { type: "string" },
        category: { type: "string", enum: ["Clinical Language", "Therapeutic Alliance", "Boundaries", "Clinical Decision-Making", "Emotional Processing", "Challenging Session Moments", "Intervention Skills"] },
        summary: { type: "string" }, clientStatement: { type: "string" }, therapistResponse: { type: "string" }, caseScenario: { type: "string" }, reflectionQuestion: { type: "string" }, hint: { type: "string" }, clinicalConsideration: { type: "string" }, clinicalConsiderationExplanation: { type: "string" }, therapistIntention: { type: "string" },
        clinicalPoints: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "body", "implication"], properties: { title: { type: "string" }, body: { type: "string" }, implication: { type: "string" } } } },
        choices: { type: "array", items: { type: "object", additionalProperties: false, required: ["label", "response", "title", "accomplishes", "helpful", "overlooks", "risks", "appropriate"], properties: { label: { type: "string" }, response: { type: "string" }, title: { type: "string" }, accomplishes: { type: "string" }, helpful: { type: "string" }, overlooks: { type: "string" }, risks: { type: "string" }, appropriate: { type: "string" } } } },
        alternatives: { type: "array", items: { type: "object", additionalProperties: false, required: ["label", "title", "response", "why"], properties: { label: { type: "string" }, title: { type: "string" }, response: { type: "string" }, why: { type: "string" } } } },
        preferredStartingPoint: { type: "string" }, biggerLesson: { type: "string" }, nuance: { type: "string" }, practicalApplication: { type: "string" },
        reflectionPrompts: { type: "array", items: { type: "string" } }, seoDescription: { type: "string" }, roundTwoEnabled: { type: "boolean" }, roundTwoClientResponse: { type: "string" }, roundTwoQuestion: { type: "string" }, roundTwoAnswerFormat: { type: "string", enum: ["Free text", "Multiple choice"] },
        roundTwoChoices: { type: "array", items: { type: "object", additionalProperties: false, required: ["label", "response"], properties: { label: { type: "string" }, response: { type: "string" } } } },
        roundTwoBreakdown: { type: "string" }, whatChangedBetweenDecisions: { type: "string" }
      }
    },
    promotion: {
      type: "object",
      additionalProperties: false,
      required: ["keyword", "campaignName", "instagramHook", "instagramCaption", "carouselSlides", "publicReplies", "openingDm", "buttonLabel", "linkDeliveryMessage", "followUpMessage", "marblismBrief"],
      properties: {
        keyword: { type: "string" }, campaignName: { type: "string" }, instagramHook: { type: "string" }, instagramCaption: { type: "string" }, carouselSlides: { type: "array", items: { type: "string" } }, publicReplies: { type: "array", items: { type: "string" } }, openingDm: { type: "string" }, buttonLabel: { type: "string" }, linkDeliveryMessage: { type: "string" }, followUpMessage: { type: "string" }, marblismBrief: { type: "string" }
      }
    }
  }
};

const instructions = `You create clinically nuanced educational practice exercises for The Confident Clinician, a professional development platform for newer therapists. Generate an editable draft, never a diagnosis, treatment plan, or substitute for supervision. Scenarios must be fictional or composite and contain no identifying information. Avoid declaring one response universally correct. Explicitly account for context, timing, culture, client preferences, power, and the therapeutic relationship. Use warm, clear language rather than academic bulk.

For a Clinical Response Check, create a client statement, an imperfect therapist response, a meaningful written reflection prompt, three teaching points, and exactly three alternative therapist responses. Leave Case Lab-only fields as empty strings or empty arrays.

For a Clinical Case Lab, create a scenario, a client statement, a decision question, and exactly four meaningfully distinct A-D options. Analyze every option without pass/fail framing. Leave Response Check-only fields as empty strings or empty arrays. If Round Two is requested, the new client response must materially change the clinical picture and require a second decision before the teaching is revealed.

The promotional content must invite participation without revealing the analysis. The Instagram caption must end with a clear instruction to comment the generated keyword. The keyword must be one memorable uppercase word. The opening DM should be enthusiastic and contain no link. The button label should be brief. The link-delivery message should tell the person to tap the website button without including a literal URL. Public replies should be natural variations, not spammy repetitions. The Marblism brief must contain everything needed to create a branded 6-8 slide Instagram carousel, caption, alt text, and CTA, and must say to save as a draft rather than publish.`;

const extractOutputText = (data) => data.output_text || (data.output || []).flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text || "";

async function generateCampaign({ idea, type, roundTwo, keyword }) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_MISSING");
  const input = `Create one complete campaign package from this idea:\n${idea}\n\nExercise format: ${type}.\nRound Two: ${roundTwo ? "required" : "not requested"}.\nKeyword preference: ${keyword || "choose the strongest concise keyword"}.`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_CAMPAIGN_MODEL || "gpt-6.1-sol",
      reasoning: { effort: "medium" },
      store: false,
      instructions,
      input,
      text: { format: { type: "json_schema", name: "practice_campaign", strict: true, schema: campaignSchema } }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`OPENAI_${response.status}:${data.error?.message || "Generation failed"}`);
  const output = extractOutputText(data);
  if (!output) throw new Error("OPENAI_EMPTY_OUTPUT");
  return JSON.parse(output);
}

module.exports = { generateCampaign };
