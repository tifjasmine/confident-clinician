/* Video page: founding spots ($37 Week 1, 10 spots, Week 1 opens Dec 1) and the Jan 1 waitlist.
   GET                                      -> { ok, left, total }
   GET ?pay=<Founding Spots record id>      -> redirects to that person's $37 Stripe checkout (the "Pay link" in the emails)
   POST { action:"reserve", first, email }  -> { ok } saves a spot free, or { ok:false, full:true }
   POST { action:"confirm", session_id }    -> { ok, first }  (back from checkout: marks the spot Paid)
   POST { action:"waitlist", first, email } -> { ok } */
const F = require("../lib/founding");

const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const originOf = event => `${event.headers["x-forwarded-proto"] || "https"}://${event.headers.host}`;
const page = (title, msg) => ({ statusCode: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#2C3F35;font:400 17px/1.6 system-ui,sans-serif;color:#2C3F35;padding:20px}.c{max-width:520px;background:#F7F2EC;border-radius:24px;padding:36px}h1{font:600 30px/1.2 Georgia,serif;margin:0 0 12px}a{color:#98452F}</style></head>
<body><div class="c"><h1>${title}</h1><p>${msg}</p><p><a href="/lab-video">Back to the Lab page</a></p></div></body></html>` });
const redirect = url => ({ statusCode: 303, headers: { Location: url, "Cache-Control": "no-store" }, body: "" });

exports.handler = async event => {
  try {
    const qs = event.queryStringParameters || {};
    if (event.httpMethod === "GET" && qs.pay) {
      const id = F.text(qs.pay, 40);
      if (!/^rec[A-Za-z0-9]{14}$/.test(id)) return page("That link didn’t work", "Please use the link in your email, or reply to the email and I’ll help.");
      let row;
      try { row = await F.getRow(id); } catch { return page("That link didn’t work", "Please use the link in your email, or reply to the email and I’ll help."); }
      const st = row.fields?.Status, email = F.cleanEmail(row.fields?.Email);
      if (st === "Paid") return page("You’re already in! 🎉", "Your founding spot is paid for. Week 1 opens December 1. Watch your email for how to sign in.");
      if (st === "Released") return page("This spot was released", "This founding spot has gone to someone else. You can still join the waitlist for the full Lab, which opens January 1.");
      if (!email) return page("That link didn’t work", "Please reply to the email and I’ll help.");
      if (!F.isTest(email) && Date.now() >= F.PAY_CLOSES_AT) return page("Founding spots are closed", "The founding spots closed at the end of December 1. You can still join the waitlist for the full Lab, which opens January 1.");
      if (!F.isTest(email) && (await F.paidCount()) >= F.TOTAL) return page("All 10 spots are taken", "All 10 founding spots have been paid for. You can still join the waitlist for the full Lab, which opens January 1.");
      if (!process.env.STRIPE_SECRET_KEY) return page("Checkout isn’t available", "Please try again in a little while.");
      const s = await F.checkout({ origin: originOf(event), email, first: F.text(row.fields?.["First name"], 80), rowId: id });
      await F.setCheckoutId(id, s.id);
      return redirect(s.url);
    }
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
    if (b.action === "reserve") {
      const r = await F.reserve({ email, first, source });
      if (r.full) return json(200, { ok: false, full: true, message: "All 10 founding spots are saved. Join the waitlist below and you’ll hear first if a spot opens up." });
      return json(200, { ok: true, already: !!r.already, paid: !!r.paid, pay: r.paid ? "" : F.payPath(r.id) });
    }
    return json(400, { ok: false });
  } catch (error) {
    console.error("Lab founding error", error.message, error.detail || "");
    return json(502, { ok: false, message: "That didn’t go through. Please try again, or email admin@theconfidentclinician.me." });
  }
};
