/* V14__par_project_id_nullable_fix_exact.sql
   professor_assignment_request.project_id 를 NULL 허용으로 보정.
   - 실제 FK 이름: FK3gm03j15kelrkw3eka1bw0nwe (SHOW CREATE TABLE 확인)
*/

SET FOREIGN_KEY_CHECKS = 0;

/* 1) 기존 FK 드롭 (정확한 이름) */
ALTER TABLE professor_assignment_request
DROP FOREIGN KEY `FK3gm03j15kelrkw3eka1bw0nwe`;

/* 2) project_id 를 NULL 허용으로 변경 */
ALTER TABLE professor_assignment_request
    MODIFY COLUMN project_id BIGINT NULL;

/* 3) FK 재생성 (원하면 ON DELETE SET NULL 추가 가능) */
ALTER TABLE professor_assignment_request
    ADD CONSTRAINT `fk_par_project_nullable`
        FOREIGN KEY (project_id) REFERENCES project(id)
            ON DELETE SET NULL;

SET FOREIGN_KEY_CHECKS = 1;
