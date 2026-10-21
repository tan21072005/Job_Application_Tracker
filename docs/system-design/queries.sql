-- Query examples for the proposed backend; not executed by the design checker.
-- $1 always comes from the verified session, never request body userId.
PREPARE jobtrack_dashboard(uuid) AS
WITH clock AS (
  SELECT CURRENT_TIMESTAMP AS as_of
), app_stats AS (
  SELECT count(*) AS total,
         count(*) FILTER (WHERE status = 'Offer') AS offers,
         count(*) FILTER (WHERE status IN ('Screening','Interview','Offer','Rejected')) AS responded,
         count(*) FILTER (WHERE status IN ('Applied','Screening','Interview','Offer','Rejected')) AS submitted
  FROM applications WHERE user_id = $1
), round_stats AS (
  SELECT count(*) AS upcoming
  FROM interviews i
  JOIN applications a ON a.id = i.application_id
  CROSS JOIN clock c
  WHERE a.user_id = $1 AND i.status = 'Scheduled' AND i.at >= c.as_of
)
SELECT a.total, r.upcoming, a.offers,
       COALESCE(100.0 * a.responded / NULLIF(a.submitted,0),0) AS response,
       c.as_of
FROM app_stats a CROSS JOIN round_stats r CROSS JOIN clock c;

-- Keyset endpoint, fixed created-desc order. Adapter validates both cursor fields.
-- Invariant: $4 is 1..100; requested+1 may be used by a separate prepared query
-- if hasMore is derived from a sentinel row. This query returns at most limit.
PREPARE jobtrack_page(uuid, timestamptz, uuid, integer) AS
SELECT * FROM applications
WHERE user_id = $1
  AND ($2 IS NULL OR (created_at,id) < ($2,$3))
ORDER BY created_at DESC,id DESC
LIMIT $4;

-- Owned read; missing and other owner's IDs both produce zero rows.
PREPARE jobtrack_owned_application(uuid,uuid) AS
SELECT * FROM applications WHERE user_id = $1 AND id = $2;

PREPARE jobtrack_owned_round(uuid,uuid) AS
SELECT i.*,a.version AS application_version
FROM interviews i JOIN applications a ON a.id = i.application_id
WHERE a.user_id = $1 AND i.id = $2;

-- A page of applications must fetch its round arrays in one additional query,
-- not an HTTP/SQL request per row. Array IDs still require the owner join.
PREPARE jobtrack_rounds_for_applications(uuid,uuid[]) AS
SELECT i.* FROM interviews i JOIN applications a ON a.id = i.application_id
WHERE a.user_id = $1 AND a.id = ANY($2)
ORDER BY i.at,i.id;
