-- Default auto_suggest to ON for new rooms.
ALTER TABLE rooms ALTER COLUMN auto_suggest SET DEFAULT true;

-- Turn auto_suggest ON for all existing non-repeat rooms.
UPDATE rooms SET auto_suggest = true WHERE repeat = false;

-- Repeat and auto_suggest are mutually exclusive — repeat wins.
UPDATE rooms SET auto_suggest = false WHERE repeat = true;
