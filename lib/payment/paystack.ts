const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!SECRET_KEY) {
  throw new Error('Missing PAYSTACK_SECRET_KEY');
}

interface InitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface VerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string; // "success"
    reference: string;
    amount: number; // in kobo
    metadata?: any;
    customer: {
      email: string;
    };
    authorization: {
      authorization_code: string;
      card_type: string;
      last4: string;
      exp_month: string;
      exp_year: string;
    };
  };
}

export const Paystack = {
  /**
   * Initialize a transaction
   */
  initialize: async (
    email: string, 
    amount: number, 
    callbackUrl: string, 
    metadata: any = {}, 
    reference?: string // <--- Added optional reference
  ): Promise<InitializeResponse> => {
    
    const payload: any = {
      email,
      amount: amount * 100, // Convert Naira to Kobo
      callback_url: callbackUrl,
      metadata,
    };

    // Only add reference if it exists to avoid overwriting Paystack auto-gen with empty string
    if (reference) {
      payload.reference = reference;
    }

    const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  /**
   * Verify a transaction
   */
  verify: async (reference: string): Promise<VerifyResponse> => {
    const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SECRET_KEY}`,
      },
    });
    return res.json();
  },
};