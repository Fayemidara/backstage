-- Add last_echo_generated to subscriptions table to track 29-day cycle
ALTER TABLE public.subscriptions
ADD COLUMN last_echo_generated TIMESTAMP WITH TIME ZONE;