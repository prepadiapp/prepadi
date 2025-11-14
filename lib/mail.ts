import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

/**
 * Sends a password reset email.
 * @param email - The recipient's email address.
 * @param token - The unique verification token.
 */
export const sendVerificationEmail = async (email: string, token: string) => {
  const verificationLink = `${appUrl}/api/auth/verify/${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'PrepWave <onboarding@resend.dev>', // Note: Resend requires a verified domain in production.
      to: [email],
      subject: 'Verify your email for PrepWave',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h1 style="color: #333;">Welcome to PrepWave!</h1>
          <p>
            Thank you for signing up. Please click the button below to verify your email address
            and complete your registration.
          </p>
          <a href="${verificationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
          <p style="margin-top: 20px;">
            If you did not sign up for this account, you can safely ignore this email.
          </p>
          <hr>
          <p style="font-size: 0.9em; color: #777;">
            If the button doesn't work, copy and paste this link into your browser:
            <br>
            <a href="${verificationLink}">${verificationLink}</a>
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { error: "Failed to send email." };
    }
    
    return { success: "Verification email sent!" };

  } catch (error) {
    console.error("Email sending exception:", error);
    return { error: "An unexpected error occurred." };
  }
};