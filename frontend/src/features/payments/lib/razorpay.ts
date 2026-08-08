// Loads the Razorpay Checkout script on demand (once) and exposes a typed
// helper to open the modal. Kept out of index.html so pages that never
// touch payments don't pay for the extra script load.

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { email?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
};

export type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

let scriptLoadPromise: Promise<void> | null = null;

const loadRazorpayScript = (): Promise<void> => {
  if (window.Razorpay) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay checkout.'));
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
};

export const openRazorpayCheckout = async (options: {
  keyId: string;
  amount: number;
  currency: string;
  orderId: string;
  description: string;
  prefillEmail?: string;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onDismiss: () => void;
}): Promise<void> => {
  await loadRazorpayScript();

  const razorpay = new window.Razorpay({
    key: options.keyId,
    amount: options.amount,
    currency: options.currency,
    order_id: options.orderId,
    name: 'Harmony Fusion Studio',
    description: options.description,
    prefill: options.prefillEmail ? { email: options.prefillEmail } : undefined,
    theme: { color: '#D8B46A' },
    handler: options.onSuccess,
    modal: { ondismiss: options.onDismiss },
  });
  razorpay.open();
};
