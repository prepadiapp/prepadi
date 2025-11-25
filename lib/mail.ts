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
      from: 'PrepPadi <onboarding@resend.dev>', // Note: Resend requires a verified domain in production.
      to: [email],
      subject: 'Verify your email for PrepPadi',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h1 style="color: #333;">Welcome to PrepPadi!</h1>
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