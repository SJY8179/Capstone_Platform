/* V3__project_professor.sql
   - project.professor_id 컬럼/인덱스/외래키를 "이미 있으면 건너뛰는" 방식으로 적용
   - MariaDB 10.x 기준
*/

-- 1) 컬럼 추가 (이미 있으면 건너뜀)
ALTER TABLE project
    ADD COLUMN IF NOT EXISTS professor_id BIGINT NULL;

-- 2) 인덱스 추가 (정보 스키마로 존재 여부 확인)
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'project'
    AND INDEX_NAME   = 'idx_project_professor'
);
SET @ddl_idx := IF(@idx_exists = 0,
  'CREATE INDEX idx_project_professor ON project(professor_id)',
  'SELECT 1');
PREPARE s1 FROM @ddl_idx;
EXECUTE s1;
DEALLOCATE PREPARE s1;

-- 3) 외래키 추가 (정보 스키마로 존재 여부 확인)
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME       = 'project'
    AND CONSTRAINT_NAME  = 'fk_project_professor'
);
SET @ddl_fk := IF(@fk_exists = 0,
  'ALTER TABLE project ADD CONSTRAINT fk_project_professor FOREIGN KEY (professor_id) REFERENCES user_account(id)',
  'SELECT 1');
PREPARE s2 FROM @ddl_fk;
EXECUTE s2;
DEALLOCATE PREPARE s2;
