import { Resend } from 'resend';

// Store the client instance outside the function after it's been initialized
let resendInstance: Resend | null = null;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

/**
 * Initializes the Resend client lazily. 
 * This prevents the client from being initialized at Next.js build time, 
 * which is when the RESEND_API_KEY is often missing in the build environment.
 */
const getResendClient = (): Resend => {
    if (resendInstance) {
        return resendInstance;
    }
    
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        // In a serverless environment like Vercel, this check helps identify missing env vars.
        throw new Error("RESEND_API_KEY environment variable is not set.");
    }

    resendInstance = new Resend(apiKey);
    return resendInstance;
};


/**
 * Sends a password reset email.
 * @param email - The recipient's email address.
 * @param token - The unique verification token.
 */
export const sendVerificationEmail = async (email: string, token: string) => {
  // Use the lazy client initializer
  const resend = getResendClient();
  
  const verificationLink = `${appUrl}/api/auth/verify/${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Prepadi <onboarding@resend.dev>', // Note: Resend requires a verified domain in production.
      to: [email],
      subject: 'Verify your email for Prepadi',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h1 style="color: #333;">Welcome to Prepadi!</h1>
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

/**
 * Sends an organization invitation email.
 * @param email - The recipient's email address.
 * @param token - The unique invite token.
 * @param orgName - The name of the organization sending the invite.
 */
export const sendOrgInviteEmail = async (email: string, token: string, orgName: string) => {
  const resend = getResendClient();
  const joinLink = `${appUrl}/join/${token}`;

  try {
    const { error } = await resend.emails.send({
      from: 'Prepadi <invites@resend.dev>', // Use verified domain in prod
      to: [email],
      subject: `Invitation to join ${orgName} on Prepadi`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h2>Hello!</h2>
          <p>You have been invited to join <strong>${orgName}</strong> on Prepadi.</p>
          <p>Accepting this invitation will give you access to their practice exams and question bank.</p>
          <p>Click the link below to get started:</p>
          <a href="${joinLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">
            Accept Invitation
          </a>
          <p style="font-size: 0.9em; color: #666;">
            This link is valid for 7 days.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend invite error:", error);
      return { error: "Failed to send invite email." };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Invite email exception:", error);
    return { error: "Unexpected error sending email." };
  }
};