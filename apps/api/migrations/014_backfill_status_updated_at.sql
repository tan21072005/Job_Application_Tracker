WITH touched AS (
  SELECT a.id,
         GREATEST(
           COALESCE(a.applied_at, a.created_at),
           a.created_at
         ) AS best_known
  FROM applications a
  WHERE a.status_updated_at IS NOT NULL
    AND a.updated_at IS NOT NULL
    AND a.status_updated_at > a.updated_at
)
UPDATE applications a
SET status_updated_at = touched.best_known
FROM touched
WHERE a.id = touched.id;
