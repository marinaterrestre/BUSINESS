// Event inquiry: emails the inquiry to Business and sends an automatic confirmation to the visitor (via Resend).
// Needs RESEND_API_KEY in Vercel env vars.
const TO = 'business@businessfirst.art';
const FROM = 'Business <business@businessfirst.art>';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Confirmation email = quote ("cotización") first, then payment methods.
// [PENDING] Copy is a draft for the client to edit. Payment link (pey) and other payment methods are not connected yet.
const MIN_SPEND = 25000, SERVICE = 0.18, DEPOSIT = 10000;
const mxn = n => '$' + n.toLocaleString('en-US') + ' MXN';

const COPY = {
  es: {
    locale: 'es-MX',
    subject: 'Tu cotización · Business',
    kicker: 'Cotización',
    hi: n => `Hola ${n},`,
    intro: (date, n) => `Gracias por contactar a Business. Tu evento el ${date}, para ${n} personas, queda confirmado. Aquí está tu cotización.`,
    ev: 'Tu evento',
    evLabels: {booking_name:'A nombre de', event_date:'Fecha', number_of_people:'Personas', message:'Tu mensaje'},
    quote: 'Cotización',
    q: {
      space:'Espacio', spaceV:'Business · lounge privado, uso exclusivo',
      hours:'Horario', hoursV:'6 PM a 2 AM',
      cap:'Aforo', capV:'Hasta 42 personas, 25 sentadas',
      min:'Consumo mínimo', svc:'Servicio (18%)', tot:'Consumo mínimo con servicio',
      dep:'Depósito para apartar la fecha', depNote:'Se descuenta de tu consumo el día del evento.'
    },
    cond: 'Condiciones',
    condText: 'Business es un lounge privado: cuando lo reservas, no hay nadie más. Si no se alcanza el consumo mínimo, Business conserva el depósito.',
    pay: 'Formas de pago',
    payText: 'Te enviaremos el enlace para pagar el depósito de ' + mxn(DEPOSIT) + ' y apartar tu fecha.',
    close: 'Es un placer hacer <i>Business</i> contigo.',
    sign: 'Business · Inflight Bar'
  },
  en: {
    locale: 'en-US',
    subject: 'Your quote · Business',
    kicker: 'Quote',
    hi: n => `Hi ${n},`,
    intro: (date, n) => `Thank you for contacting Business. Your event on ${date}, for ${n} guests, is confirmed. Here is your quote.`,
    ev: 'Your event',
    evLabels: {booking_name:'Booking under the name of', event_date:'Date', number_of_people:'Guests', message:'Your message'},
    quote: 'Quote',
    q: {
      space:'Space', spaceV:'Business · private lounge, exclusive use',
      hours:'Hours', hoursV:'6 PM to 2 AM',
      cap:'Capacity', capV:'Up to 42 people, 25 seated',
      min:'Minimum spend', svc:'Service (18%)', tot:'Minimum spend with service',
      dep:'Deposit to hold the date', depNote:'Applied to your tab on the night of the event.'
    },
    cond: 'Terms',
    condText: 'Business is a private lounge: when you reserve it, no one else is there. If the minimum spend is not reached, Business keeps the deposit.',
    pay: 'Payment',
    payText: 'We will send you the link to pay the ' + mxn(DEPOSIT) + ' deposit and hold your date.',
    close: 'It’s a pleasure doing <i>Business</i> with you.',
    sign: 'Business · Inflight Bar'
  }
};

function fmtDate(iso, locale) {
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(locale, {weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone:'UTC'});
}

const BG = '#14061a', RED = '#EE3725', PINK = '#FFA3A2', LINE = '#3a2142';
const serif = "Georgia,'Times New Roman',serif";
const sans = "Helvetica,Arial,sans-serif";

function row(k, v, strong) {
  return `<tr><td style="padding:12px 0;border-bottom:1px solid ${LINE};color:${PINK};font:13px ${sans};vertical-align:top;width:44%">${esc(k)}</td><td style="padding:12px 0;border-bottom:1px solid ${LINE};color:#fff;font:${strong?'700 ':''}15px ${sans};vertical-align:top;white-space:pre-wrap">${v}</td></tr>`;
}
function h(t) {
  return `<p style="margin:36px 0 4px;color:${RED};font:700 11px ${sans};letter-spacing:.22em;text-transform:uppercase">${esc(t)}</p>`;
}

function confirmationHtml(c, d) {
  const svc = Math.round(MIN_SPEND * SERVICE);
  const ev = Object.keys(c.evLabels).map(k => row(c.evLabels[k], k === 'event_date' ? esc(fmtDate(d.event_date, c.locale)) : esc(d[k]))).join('');
  const q = c.q;
  const quote =
    row(q.space, esc(q.spaceV)) + row(q.hours, esc(q.hoursV)) + row(q.cap, esc(q.capV)) +
    row(q.min, esc(mxn(MIN_SPEND))) + row(q.svc, esc(mxn(svc))) + row(q.tot, esc(mxn(MIN_SPEND + svc)), true) +
    row(q.dep, `<b>${esc(mxn(DEPOSIT))}</b><br><span style="color:${PINK};font-size:13px">${esc(q.depNote)}</span>`);
  return `<div style="background:${BG};padding:40px 16px">
  <div style="max-width:560px;margin:0 auto">
    <p style="margin:0;color:${RED};font:italic 900 44px/1 ${serif}">Business</p>
    <p style="margin:8px 0 32px;color:${PINK};font:11px ${sans};letter-spacing:.22em;text-transform:uppercase">Inflight Bar · ${esc(c.kicker)}</p>
    <p style="margin:0 0 12px;color:#fff;font:700 20px ${sans}">${esc(c.hi(d.name))}</p>
    <p style="margin:0;color:#fff;font:16px/1.6 ${sans}">${esc(c.intro(fmtDate(d.event_date, c.locale), d.number_of_people))}</p>
    ${h(c.ev)}<table role="presentation" width="100%" style="border-collapse:collapse;border-top:1px solid ${RED}">${ev}</table>
    ${h(c.quote)}<table role="presentation" width="100%" style="border-collapse:collapse;border-top:1px solid ${RED}">${quote}</table>
    ${h(c.cond)}<p style="margin:8px 0 0;color:#fff;font:15px/1.6 ${sans}">${esc(c.condText)}</p>
    ${h(c.pay)}<p style="margin:8px 0 0;color:#fff;font:15px/1.6 ${sans}">${esc(c.payText)}</p>
    <p style="margin:44px 0 6px;color:#fff;font:italic 22px/1.3 ${serif}">${c.close}</p>
    <p style="margin:0;color:${PINK};font:13px ${sans}">${esc(c.sign)}</p>
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

module.exports = handler;
module.exports.build = (lang, d) => confirmationHtml(COPY[lang === 'es' ? 'es' : 'en'], d);
