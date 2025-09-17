/* V12__par_project_id_nullable_fix_final.sql */

/* 0) FK 실제 이름은 SHOW CREATE TABLE에서 본 그대로 사용 */
-- 현재 FK 이름: FK3gm03j15kelrkw3eka1bw0nwe

/* 1) FK 먼저 드롭 */
ALTER TABLE professor_assignment_request
DROP FOREIGN KEY FK3gm03j15kelrkw3eka1bw0nwe;

/* 2) project_id 를 NULL 허용으로 변경 (정확한 타입/길이 유지) */
ALTER TABLE professor_assignment_request
    MODIFY COLUMN project_id BIGINT(20) NULL;

/* 3) FK 재생성 (원하면 ON DELETE SET NULL 추가 가능) */
ALTER TABLE professor_assignment_request
    ADD CONSTRAINT fk_par_project_nullable
        FOREIGN KEY (project_id) REFERENCES project(id);
-- 원하면: ON DELETE SET NULL
