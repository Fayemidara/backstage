-- Add Paystack columns to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS paystack_reference TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'paystack';

-- Create index for faster lookups by reference
CREATE INDEX IF NOT EXISTS idx_subscriptions_paystack_reference ON public.subscriptions(paystack_reference);
