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

module.exports = { notifyNewComment };
