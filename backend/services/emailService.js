// backend/services/emailService.js
import { Resend } from "resend";

let resendInstance;

function getResend() {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY environment variable");
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

export async function sendEmail({ to, subject, html }) {
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: "AIO Cart <noreply@aiocart.lk>",
      to,
      subject,
      html,
    });
console.log("Email sent:", result);
    return result;
    
  } catch (error) {
    console.error("Email error:", error);
    throw error;
  }
}
