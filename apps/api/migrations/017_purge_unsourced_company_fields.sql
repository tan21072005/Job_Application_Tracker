UPDATE company_profiles
SET size = '',
    website = '',
    description = '',
    tech_stack = '[]'::jsonb,
    key_pros = '[]'::jsonb,
    key_red_flags = '[]'::jsonb,
    interview_questions = '[]'::jsonb,
    culture_scores = '{}'::jsonb,
    salary_benchmarks = '[]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE provenance->'size' IS NULL
  AND provenance->'website' IS NULL
  AND provenance->'description' IS NULL
  AND (
    size <> ''
    OR website <> ''
    OR description <> ''
    OR tech_stack <> '[]'::jsonb
    OR key_pros <> '[]'::jsonb
    OR key_red_flags <> '[]'::jsonb
  );
