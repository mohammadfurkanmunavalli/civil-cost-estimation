-- Migration 014: Add maintenance_rate and fuel_rate to resources table for equipment

ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS maintenance_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fuel_rate NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.resources.maintenance_rate IS 'Daily maintenance cost rate for equipment resources';
COMMENT ON COLUMN public.resources.fuel_rate IS 'Daily fuel cost rate for equipment resources';

NOTIFY pgrst, 'reload schema';
