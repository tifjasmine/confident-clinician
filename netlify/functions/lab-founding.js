/* Video page: founding spots ($37 Week 1, 10 spots) and the Jan 1 waitlist.
   GET                                   -> { ok, left, total }
   POST { action:"start", first, email } -> { ok, url } (Stripe checkout) or { ok:false, soldOut:true }
   POST { action:"confirm", session_id } -> { ok, first }  (back from checkout: marks the spot Paid)
   POST { action:"waitlist", first, email } -> { ok } */
const F = require("../lib/founding");

const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const originOf = event => `${event.headers["x-forwarded-proto"] || "https"}://${event.headers.host}`;

exports.handler = async event => {
  try {
    if (event.httpMethod === "GET") return json(200, { ok: true, left: await F.spotsLeft(), total: F.TOTAL });
    if (event.httpMethod !== "POST") return json(405, { ok: false });
    if ((event.body || "").length > 4000) return json(413, { ok: false });
    let b = {};
    try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { ok: false, message: "Something went wrong. Please try again." }); }
    if (F.text(b.website)) return json(200, { ok: true }); /* honeypot */
    const source = F.text(b.source, 200);

    if (b.action === "confirm") {
      const id = F.text(b.session_id, 200);
      if (!/^cs_[\w]+$/.test(id)) return json(400, { ok: false });
      const s = await F.stripe(`checkout/sessions/${encodeURIComponent(id)}`);
      if (!F.sessionIsFounding(s)) return json(400, { ok: false });
      if (s.payment_status !== "paid") return json(200, { ok: false, pending: true });
      const out = await F.markPaid(s);
      return json(200, { ok: true, first: out.first || "" });
    }

    const email = F.cleanEmail(b.email), first = F.text(b.first, 80);
    if (!email || !first) return json(400, { ok: false, message: "Please add your first name and email." });

    if (b.action === "waitlist") {
      await F.joinWaitlist({ email, first, source });
      return json(200, { ok: true });
    }

    if (b.action === "start") {
      if (!process.env.STRIPE_SECRET_KEY) return json(503, { ok: false, message: "Checkout isn’t available right now. Please try again soon." });
      if (!F.isTest(email) && (await F.spotsLeft()) <= 0) return json(200, { ok: false, soldOut: true, message: "All 10 founding spots are taken. Join the waitlist below and you’ll hear first when the full Lab opens." });
      const rowId = await F.startRow({ email, first, source });
      const s = await F.checkout({ origin: originOf(event), email, first, rowId });
      await F.setCheckoutId(rowId, s.id);
      return json(200, { ok: true, url: s.url });
    }
    return json(400, { ok: false });
  } catch (error) {
    console.error("Lab founding error", error.message, error.detail || "");
    return json(502, { ok: false, message: "That didn’t go through. Please try again, or email admin@theconfidentclinician.me." });
  }
};
