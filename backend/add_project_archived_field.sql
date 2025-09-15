-- Add archived field to Project entity for soft delete functionality
-- Migration date: 2025-09-16

ALTER TABLE project
ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for performance on archived filter queries
CREATE INDEX idx_project_archived ON project(archived);

-- Add comment for documentation
COMMENT ON COLUMN project.archived IS 'Soft delete flag: true = archived (hidden from default view), false = active';