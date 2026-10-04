export type EmailMessage = {
  idempotencyKey?: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
};
export interface EmailProvider {
  send(msg: EmailMessage): Promise<void>;
}
export const consoleEmailProvider: EmailProvider = {
  async send(m) {
    if (process.env.NODE_ENV === "production")
      throw new Error("Configure Resend before sending production email");
    console.info(`[email:development] ${m.to} | ${m.subject}\n${m.html}`);
  },
};
export const resendEmailProvider: EmailProvider = {
  async send(m) {
    if (!process.env.EMAIL_API_KEY || !process.env.EMAIL_FROM)
      throw new Error("Email provider is not configured");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
        "Content-Type": "application/json",
        ...(m.idempotencyKey ? { "Idempotency-Key": m.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [m.to],
        subject: m.subject,
        html: m.html,
        text: m.text,
      }),
    });
    if (!res.ok) throw new Error(`Email delivery failed (${res.status})`);
  },
};
