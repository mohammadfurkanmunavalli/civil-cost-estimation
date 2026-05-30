-- Make INR the database default for new currency-bearing rows.
-- Existing project amounts should be converted from Settings > Preferences
-- because that operation updates the stored numeric values as well.

ALTER TABLE financial_settings ALTER COLUMN currency SET DEFAULT 'INR';
ALTER TABLE resources ALTER COLUMN currency SET DEFAULT 'INR';
ALTER TABLE cost_databases ALTER COLUMN currency SET DEFAULT 'INR';

INSERT INTO app_settings (key, value)
VALUES ('default_currency', 'INR')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
