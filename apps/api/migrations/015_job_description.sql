ALTER TABLE applications ADD COLUMN IF NOT EXISTS job_description text;

UPDATE applications
SET job_description = notes,
    notes = NULL
WHERE job_description IS NULL
  AND notes IS NOT NULL
  AND length(notes) >= 400
  AND notes LIKE '%Mô tả công việc%';
