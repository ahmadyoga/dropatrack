-- Default auto_suggest to ON for new rooms.
ALTER TABLE rooms ALTER COLUMN auto_suggest SET DEFAULT true;

-- Repeat and auto_suggest are mutually exclusive — repeat wins.
-- Make existing data consistent.
UPDATE rooms SET auto_suggest = false WHERE repeat = true;
