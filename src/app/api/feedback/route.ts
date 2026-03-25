import { createRouteLogger } from '@/lib/route-logger';
import { site } from '@/config/site';

const log = createRouteLogger('feedback');

type FeedbackType = 'newsletter' | 'feedback' | 'bug';

interface FeedbackBody {
  type: FeedbackType;
  email?: string;
  message?: string;
  page?: string;
}

const VALID_TYPES: FeedbackType[] = ['newsletter', 'feedback', 'bug'];

function buildHtml(body: FeedbackBody): string {
  const heading =
    body.type === 'newsletter'
      ? '📬 New Newsletter Signup'
      : body.type === 'feedback'
        ? '💬 New Feedback'
        : '🐛 Bug Report';

  return `
    <div style="font-family: monospace; padding: 20px; max-width: 500px;">
      <h2 style="margin: 0 0 16px;">${heading}</h2>
      <p><strong>Email:</strong> ${body.email || '(not provided)'}</p>
      ${body.message ? `<p><strong>Message:</strong><br/>${body.message}</p>` : ''}
      ${body.page ? `<p><strong>Page:</strong> ${body.page}</p>` : ''}
      <hr style="margin: 16px 0; border: 1px solid #333;" />
      <p style="color: #666; font-size: 12px;">Sent from <strong>${site.name}</strong> &mdash; <a href="${site.url}">${site.url}</a></p>
    </div>
  `;
}

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();

  try {
    const body = (await req.json()) as FeedbackBody;
    log.info(ctx.reqId, 'Request received', { type: body.type, email: body.email });

    // Validate type
    if (!body.type || !VALID_TYPES.includes(body.type)) {
      log.warn(ctx.reqId, 'Invalid type', { type: body.type });
      return log.end(ctx, Response.json({ error: 'Invalid type' }, { status: 400 }));
    }

    // Validate email — required for newsletter, optional for feedback/bug
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const hasEmail = body.email && emailRegex.test(body.email);

    if (body.type === 'newsletter' && !hasEmail) {
      log.warn(ctx.reqId, 'Invalid email for newsletter', { email: body.email });
      return log.end(ctx, Response.json({ error: 'Valid email required' }, { status: 400 }));
    }

    // --- Email delivery (optional — configure SMTP_HOST or RESEND_API_KEY to enable) ---

    const smtpHost = process.env.SMTP_HOST;
    const resendKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.FEEDBACK_TO_EMAIL || site.email;

    if (smtpHost) {
      // SMTP path — requires nodemailer: pnpm add nodemailer @types/nodemailer
      // Uncomment when ready:
      // const nodemailer = await import('nodemailer');
      // const transporter = nodemailer.createTransport({
      //   host: smtpHost,
      //   port: Number(process.env.SMTP_PORT ?? 587),
      //   auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      // });
      // await transporter.sendMail({
      //   from: process.env.SMTP_FROM ?? site.email,
      //   to: toEmail,
      //   subject: `[${site.name}] ${body.type}`,
      //   html: buildHtml(body),
      // });
      log.warn(ctx.reqId, 'SMTP configured but nodemailer not installed — email not sent');
    } else if (resendKey) {
      // Resend path — requires resend: pnpm add resend
      // Uncomment when ready:
      // const { Resend } = await import('resend');
      // const resend = new Resend(resendKey);
      // await resend.emails.send({
      //   from: site.email,
      //   to: toEmail,
      //   subject: `[${site.name}] ${body.type}`,
      //   html: buildHtml(body),
      // });
      //
      // // Add newsletter signup to Resend contacts
      // if (body.type === 'newsletter' && hasEmail) {
      //   const segmentId = process.env.RESEND_SEGMENT_ID;
      //   await resend.contacts.create({
      //     email: body.email!,
      //     unsubscribed: false,
      //     ...(segmentId && { segments: [{ id: segmentId }] }),
      //   });
      // }
      log.warn(ctx.reqId, 'RESEND_API_KEY configured but resend SDK not installed — email not sent');
    } else {
      log.warn(ctx.reqId, 'No email service configured — set SMTP_HOST or RESEND_API_KEY to enable delivery');
    }

    // Log the submission regardless (always visible in Vercel logs)
    log.info(ctx.reqId, 'Feedback received', {
      type: body.type,
      hasEmail: !!hasEmail,
      hasMessage: !!body.message,
      page: body.page,
    });

    return log.end(ctx, Response.json({ ok: true }));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
