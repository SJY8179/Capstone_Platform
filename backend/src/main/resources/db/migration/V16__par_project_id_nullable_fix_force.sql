/* V16__par_project_id_nullable_fix_force.sql
   professor_assignment_request.project_id 를 NULL 허용으로 강제 보정
   (실제 FK 이름은 SHOW CREATE TABLE로 확인한 값 사용)
*/

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE professor_assignment_request
DROP FOREIGN KEY `FK3gm03j15kelrkw3eka1bw0nwe`;

ALTER TABLE professor_assignment_request
    MODIFY COLUMN project_id BIGINT NULL;

ALTER TABLE professor_assignment_request
    ADD CONSTRAINT `fk_par_project_nullable`
        FOREIGN KEY (project_id) REFERENCES project(id)
            ON DELETE SET NULL;

SET FOREIGN_KEY_CHECKS = 1;
