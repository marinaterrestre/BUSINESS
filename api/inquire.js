// Event inquiry: emails the inquiry to Business right away and sends the visitor an automatic thank-you email (via Resend).
// The quote, policies and how to hold the date are sent manually by the team from Gmail.
// Needs RESEND_API_KEY in Vercel env vars.
const TO = 'business@businessfirst.art';
const FROM = 'Business <business@businessfirst.art>';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const COPY = {
  es: {
    subject: 'Business | Recibimos tu consulta',
    kicker: 'Consulta',
    hi: n => `Hola ${n},`,
    body: 'Gracias por escribirnos. Nuestro equipo se pondrá en contacto contigo lo antes posible.',
    sign: 'Business'
  },
  en: {
    subject: 'Business | We received your inquiry',
    kicker: 'Inquiry',
    hi: n => `Hi ${n},`,
    body: 'Thank you for reaching out. Our team will be in touch with you as soon as possible.',
    sign: 'Business'
  }
};

const BG = '#ffffff', INK = '#14061a', RED = '#EE3725', MUTED = '#6f5d78';
const serif = "Georgia,'Times New Roman',serif";
const sans = "Helvetica,Arial,sans-serif";

function thanksHtml(c, d) {
  return `<div style="background:${BG};padding:40px 16px">
  <div style="max-width:560px;margin:0 auto">
    <p style="margin:0;color:${RED};font:italic 900 44px/1 ${serif}">Business</p>
    <p style="margin:8px 0 32px;color:${MUTED};font:11px ${sans};letter-spacing:.22em;text-transform:uppercase">Inflight Bar · ${esc(c.kicker)}</p>
    <p style="margin:0 0 12px;color:${INK};font:700 20px ${sans}">${esc(c.hi(d.name))}</p>
    <p style="margin:0;color:${INK};font:16px/1.6 ${sans}">${esc(c.body)}</p>
    <p style="margin:44px 0 0;color:${MUTED};font:13px ${sans}">${esc(c.sign)}</p>
  </div></div>`;
}

async function send(payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error(`resend ${r.status}: ${await r.text()}`);
}

const handler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ok:false});
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (b.company) return res.status(200).json({ok:true}); // honeypot
  const lang = b.lang === 'es' ? 'es' : 'en';
  const d = {
    name: String(b.name || '').trim().slice(0, 120),
    email: String(b.email || '').trim().slice(0, 200),
    phone: String(b.phone || '').trim().slice(0, 40),
    booking_name: String(b.booking_name || '').trim().slice(0, 120),
    event_date: String(b.event_date || '').trim().slice(0, 20),
    number_of_people: String(b.number_of_people || '').trim().slice(0, 10),
    message: String(b.message || '').trim().slice(0, 4000)
  };
  if (!d.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) || d.phone.replace(/\D/g, '').length < 7 || !d.booking_name || !d.event_date || !(+d.number_of_people >= 1 && +d.number_of_people <= 42) || !d.message) {
    return res.status(400).json({ok:false, error:'invalid'});
  }
  const wd = new Date(d.event_date + 'T00:00:00Z').getUTCDay(); // only Wednesday (3) to Saturday (6) are open
  if (isNaN(wd) || wd < 3 || wd > 6) return res.status(400).json({ok:false, error:'invalid_day'});
  try {
    const internalLabels = {name:'Name', email:'Email', phone:'Phone', booking_name:'Booking under the name of', event_date:'Event date', number_of_people:'Number of people', message:'Message'};
    await send({
      from: FROM, to: [TO], reply_to: d.email,
      subject: `Event inquiry — ${d.name}`,
      html: `<div style="font-family:Helvetica,Arial,sans-serif;color:#111"><table role="presentation" style="border-collapse:collapse">${
        Object.keys(internalLabels).map(k => `<tr><td style="padding:6px 16px 6px 0;color:#666;vertical-align:top">${esc(internalLabels[k])}</td><td style="padding:6px 0;white-space:pre-wrap">${esc(d[k])}</td></tr>`).join('')
      }</table></div>`
    });
    const c = COPY[lang];
    await send({from: FROM, to: [d.email], reply_to: TO, subject: c.subject, html: thanksHtml(c, d)});
    return res.status(200).json({ok:true});
  } catch (e) {
    console.error(e);
    return res.status(500).json({ok:false, error:'send_failed'});
  }
};

module.exports = handler;
module.exports.build = (lang, d) => thanksHtml(COPY[lang === 'es' ? 'es' : 'en'], d);
