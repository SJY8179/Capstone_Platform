/* V13__par_project_id_nullable_fix_exact.sql
   SHOW CREATE TABLE 로 확인된 실제 FK 이름을 사용해서 NULL 허용으로 보정합니다.
*/

/* 안전하게 FK 체크 끄기 (필수는 아니지만 환경에 따라 유용) */
SET FOREIGN_KEY_CHECKS = 0;

/* 1) 현재 걸린 FK 를 '정확한 이름'으로 드롭 */
ALTER TABLE professor_assignment_request
DROP FOREIGN KEY `FK3gm03j15kelrkw3eka1bw0nwe`;

/* 2) project_id 를 NULL 허용으로 변경 */
ALTER TABLE professor_assignment_request
    MODIFY COLUMN project_id BIGINT NULL;

/* 3) FK 재생성 (원하면 ON DELETE SET NULL 옵션 추가) */
ALTER TABLE professor_assignment_request
    ADD CONSTRAINT `fk_par_project_nullable`
        FOREIGN KEY (project_id) REFERENCES project(id)
            ON DELETE SET NULL;

/* 다시 켜기 */
SET FOREIGN_KEY_CHECKS = 1;
