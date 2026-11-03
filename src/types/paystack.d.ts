interface PaystackPopConfig {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  ref?: string;
  metadata?: Record<string, unknown>;
  callback: (response: { reference: string; status: string }) => void;
  onClose: () => void;
}

interface PaystackPopInstance {
  openIframe: () => void;
}

interface PaystackPop {
  setup: (config: PaystackPopConfig) => PaystackPopInstance;
}

declare const PaystackPop: PaystackPop;
