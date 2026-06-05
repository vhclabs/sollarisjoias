ALTER TABLE public.settings 
  ADD COLUMN IF NOT EXISTS auto_billing_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_billing_tone text NOT NULL DEFAULT 'amigavel',
  ADD COLUMN IF NOT EXISTS auto_billing_upsell boolean NOT NULL DEFAULT true;