// Feedback Worker — receives POSTs from vimyasa (and other apps in the
// future), forwards them to a configured email via Resend.
//
// Deployed as a Cloudflare Worker. Source of truth lives here; the
// dashboard-deployed copy must match this file.
//
// Environment variables (set in Cloudflare dashboard → Settings → Variables):
//   RESEND_API_KEY     (Secret)  — Resend API key with Sending access
//   RECIPIENT_EMAIL    (Text)    — where to forward feedback (e.g. justin@taesongkim.com)
//   SENDER_EMAIL       (Text)    — verified Resend sender (e.g. feedback@vimyasa.com)
//   ALLOWED_PROJECTS   (Text)    — comma-separated allowlist (e.g. "vimyasa,projectX")
//
// Endpoints:
//   GET  /     → health check (returns "feedback worker ok")
//   POST /     → submit feedback (JSON body, see below)
//
// POST body schema:
//   {
//     "message":    string  (required, max 10,000 chars)
//     "name":       string  (optional — sender's name if they provided one)
//     "projectTag": string  (required, must match ALLOWED_PROJECTS)
//     "clientId":   string  (required, opaque UUID — anonymous tester ID)
//     "appVersion": string  (optional)
//     "os":         string  (optional)
//     "locale":     string  (optional)
//   }
//
// Response: { "ok": true } on success, { "error": "..." } with appropriate
// 4xx/5xx status on failure.
//
// Privacy posture: this Worker logs ONLY metadata (project, short clientId,
// version, os) for debugging. Message bodies are forwarded to email and
// never logged or stored.

export default {
  async fetch(request, env) {
    if (request.method === 'GET') {
      return new Response('feedback worker ok', { status: 200 });
    }

    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }));
    }

    if (request.method !== 'POST') {
      return cors(json({ error: 'method not allowed' }, 405));
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return cors(json({ error: 'invalid JSON' }, 400));
    }

    if (!payload.message || typeof payload.message !== 'string') {
      return cors(json({ error: 'message required' }, 400));
    }
    if (payload.message.length > 10_000) {
      return cors(json({ error: 'message too long (max 10,000 chars)' }, 400));
    }
    if (!payload.projectTag || typeof payload.projectTag !== 'string') {
      return cors(json({ error: 'projectTag required' }, 400));
    }
    if (!payload.clientId || typeof payload.clientId !== 'string') {
      return cors(json({ error: 'clientId required' }, 400));
    }

    if (env.ALLOWED_PROJECTS) {
      const allowed = env.ALLOWED_PROJECTS.split(',').map((p) => p.trim());
      if (!allowed.includes(payload.projectTag)) {
        return cors(json({ error: 'unknown project' }, 400));
      }
    }

    const shortId = payload.clientId.slice(0, 8);
    const senderLabel = payload.name
      ? `${payload.name} (${shortId})`
      : `anonymous (${shortId})`;
    const subject = `[${payload.projectTag}] feedback from ${senderLabel}`;
    const bodyLines = [
      `Project:     ${payload.projectTag}`,
      `From:        ${senderLabel}`,
      `App version: ${payload.appVersion ?? 'unknown'}`,
      `OS:          ${payload.os ?? 'unknown'}`,
      payload.locale ? `Locale:      ${payload.locale}` : null,
      `Client ID:   ${payload.clientId}`,
      '',
      '--- Message ---',
      '',
      payload.message,
    ].filter(Boolean);
    const textBody = bodyLines.join('\n');

    const senderEmail = env.SENDER_EMAIL || 'feedback@vimyasa.com';
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: senderEmail,
        to: env.RECIPIENT_EMAIL,
        subject,
        text: textBody,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend failure', resendRes.status, errText);
      return cors(json({ error: 'forwarding failed' }, 502));
    }

    console.log('forwarded', {
      project: payload.projectTag,
      clientId: shortId,
      version: payload.appVersion,
      os: payload.os,
    });

    return cors(json({ ok: true }, 200));
  },
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}
