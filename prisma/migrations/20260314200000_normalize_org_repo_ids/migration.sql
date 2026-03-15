-- Normalize org_id and repo_id to lowercase across all tables
-- This prevents duplicate repos with different casing (e.g., "MiguelMedeiros/unforgit" vs "miguelmedeiros/unforgit")

-- Normalize memories table
UPDATE memories SET org_id = LOWER(org_id), repo_id = LOWER(repo_id);

-- Normalize api_keys table
UPDATE api_keys SET org_id = LOWER(org_id), repo_id = LOWER(repo_id) WHERE repo_id IS NOT NULL;
UPDATE api_keys SET org_id = LOWER(org_id) WHERE repo_id IS NULL;

-- Normalize tombstones table
UPDATE tombstones SET org_id = LOWER(org_id), repo_id = LOWER(repo_id);

-- Normalize user_repo_access table
UPDATE user_repo_access SET org_id = LOWER(org_id), repo_id = LOWER(repo_id);

-- Normalize api_key_logs table
UPDATE api_key_logs SET org_id = LOWER(org_id), repo_id = LOWER(repo_id);
