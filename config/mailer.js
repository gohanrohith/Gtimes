const nodemailer = require('nodemailer');

function getTransport() {
  if (!process.env.MAIL_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.MAIL_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

async function notifyNewComment(data) {
  const t = getTransport();
  if (!t) return;
  await t.sendMail({
    from: process.env.MAIL_FROM,
    to: process.env.MAIL_USER,
    subject: `New comment awaiting moderation — GTimes`,
    html: `
      <h3>New comment on: ${data.article_title}</h3>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email || '—'}</p>
      <p><strong>Comment:</strong><br>${data.content}</p>
      <p><a href="https://admin.gtimes.in/comments">Review in admin panel</a></p>
    `,
  });
}

async function sendBroadcast({ subject, htmlBody, subscribers, siteUrl }) {
  const t = getTransport();
  if (!t) throw new Error('Email not configured — set MAIL_PASS in .env');
  let sent = 0;
  for (const sub of subscribers) {
    const unsubLink = `${siteUrl}/newsletter/unsubscribe?token=${sub.token}`;
    try {
      await t.sendMail({
        from: process.env.MAIL_FROM,
        to: sub.email,
        subject,
        html: `${htmlBody}
          <hr style="margin-top:2rem;border:none;border-top:1px solid #eee">
          <p style="font-size:.75rem;color:#999;margin-top:.75rem">
            You received this because you subscribed to <strong>GTimes</strong> newsletters.
            <a href="${unsubLink}" style="color:#999">Unsubscribe</a>
          </p>`,
      });
      sent++;
    } catch { /* skip individual failures */ }
  }
  return sent;
}

module.exports = { notifyNewComment, sendBroadcast };
