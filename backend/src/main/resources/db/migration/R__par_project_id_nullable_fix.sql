/*
  professor_assignment_request.project_id 를 NULL 허용으로 바꾸고
  FK를 ON DELETE SET NULL 로 재구성한다.
  - 이미 NULL 허용이면 아무 것도 하지 않음
  - FK 이름이 환경마다 달라도 동적으로 찾아서 처리
*/

-- 현재 컬럼이 NOT NULL 인지 확인
SET @need_fix := (
  SELECT CASE WHEN COLUMN_KEY IS NOT NULL THEN 1 ELSE 0 END
  FROM (
    SELECT CASE WHEN (SELECT IS_NULLABLE
                      FROM INFORMATION_SCHEMA.COLUMNS
                      WHERE TABLE_SCHEMA = DATABASE()
                        AND TABLE_NAME   = 'professor_assignment_request'
                        AND COLUMN_NAME  = 'project_id') = 'NO' THEN 'Y' END AS COLUMN_KEY
  ) AS t
);

-- project_id를 참조하는 FK 이름 조회
SET @fk_name := (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'professor_assignment_request'
    AND COLUMN_NAME  = 'project_id'
    AND REFERENCED_TABLE_NAME = 'project'
  LIMIT 1
);

-- FK 드롭 (필요할 때만)
SET @sql1 := IF(@need_fix=1 AND @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE professor_assignment_request DROP FOREIGN KEY `', @fk_name, '`;'),
  'SELECT 1');
PREPARE stmt1 FROM @sql1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;

-- 컬럼 NULL 허용 (필요할 때만)
SET @sql2 := IF(@need_fix=1,
  'ALTER TABLE professor_assignment_request MODIFY COLUMN project_id BIGINT NULL;',
  'SELECT 1');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- FK 재생성 (ON DELETE SET NULL)
-- 동일 이름이 이미 있으면 다른 이름으로 생성되므로 안전
SET @sql3 := IF(@need_fix=1,
  'ALTER TABLE professor_assignment_request
     ADD CONSTRAINT fk_par_project_nullable
     FOREIGN KEY (project_id) REFERENCES project(id)
     ON DELETE SET NULL;',
  'SELECT 1');
PREPARE stmt3 FROM @sql3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;
