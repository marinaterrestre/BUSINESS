// Event inquiry: emails the inquiry to Business and sends an automatic confirmation to the visitor (via Resend).
// Needs RESEND_API_KEY in Vercel env vars.
const TO = 'business@businessfirst.art';
const FROM = 'Business <business@businessfirst.art>';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// [PENDING] Confirmation email copy is a draft for the client to edit.
const COPY = {
  en: {
    subject: 'We received your inquiry · Business',
    hi: n => `Hi ${n},`,
    body: 'Thank you for your inquiry. We received it and will be in touch.',
    sum: 'What you sent',
    labels: {booking_name:'Booking under the name of', event_date:'Event date', number_of_people:'Number of people', message:'Message'},
    sign: 'Business · Inflight Bar'
  },
  es: {
    subject: 'Recibimos tu consulta · Business',
    hi: n => `Hola ${n},`,
    body: 'Gracias por tu consulta. La recibimos y nos pondremos en contacto.',
    sum: 'Lo que enviaste',
    labels: {booking_name:'A nombre de', event_date:'Fecha del evento', number_of_people:'Número de personas', message:'Mensaje'},
    sign: 'Business · Inflight Bar'
  }
};

function rows(obj, labels) {
  return Object.keys(labels).map(k =>
    `<tr><td style="padding:6px 16px 6px 0;color:#FFA3A2;vertical-align:top;font-size:13px">${esc(labels[k])}</td><td style="padding:6px 0;color:#fff;font-size:15px;white-space:pre-wrap">${esc(obj[k])}</td></tr>`
  ).join('');
}

function confirmationHtml(c, d) {
  return `<div style="background:#14061a;padding:40px 24px;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto">
    <p style="margin:0 0 28px;font:italic 900 34px Georgia,'Times New Roman',serif;color:#EE3725">Business</p>
    <p style="margin:0 0 12px;color:#fff;font-size:16px">${esc(c.hi(d.name))}</p>
    <p style="margin:0 0 28px;color:#fff;font-size:16px;line-height:1.5">${esc(c.body)}</p>
    <p style="margin:0 0 8px;color:#FFA3A2;font-size:12px;letter-spacing:.08em;text-transform:uppercase">${esc(c.sum)}</p>
    <table role="presentation" style="border-collapse:collapse">${rows(d, c.labels)}</table>
    <p style="margin:32px 0 0;color:#FFA3A2;font-size:13px">${esc(c.sign)}</p>
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

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ok:false});
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (b.company) return res.status(200).json({ok:true}); // honeypot
  const lang = b.lang === 'es' ? 'es' : 'en';
  const d = {
    name: String(b.name || '').trim().slice(0, 120),
    email: String(b.email || '').trim().slice(0, 200),
    booking_name: String(b.booking_name || '').trim().slice(0, 120),
    event_date: String(b.event_date || '').trim().slice(0, 20),
    number_of_people: String(b.number_of_people || '').trim().slice(0, 10),
    message: String(b.message || '').trim().slice(0, 4000)
  };
  if (!d.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) || !d.booking_name || !d.event_date || !(+d.number_of_people >= 1 && +d.number_of_people <= 42) || !d.message) {
    return res.status(400).json({ok:false, error:'invalid'});
  }
  try {
    const internalLabels = {name:'Name', email:'Email', booking_name:'Booking under the name of', event_date:'Event date', number_of_people:'Number of people', message:'Message'};
    await send({
      from: FROM, to: [TO], reply_to: d.email,
      subject: `Event inquiry — ${d.name}`,
      html: `<div style="font-family:Helvetica,Arial,sans-serif;color:#111"><table role="presentation" style="border-collapse:collapse">${
        Object.keys(internalLabels).map(k => `<tr><td style="padding:6px 16px 6px 0;color:#666;vertical-align:top">${esc(internalLabels[k])}</td><td style="padding:6px 0;white-space:pre-wrap">${esc(d[k])}</td></tr>`).join('')
      }</table></div>`
    });
    const c = COPY[lang];
    await send({from: FROM, to: [d.email], reply_to: TO, subject: c.subject, html: confirmationHtml(c, d)});
    return res.status(200).json({ok:true});
  } catch (e) {
    console.error(e);
    return res.status(500).json({ok:false, error:'send_failed'});
  }
};
