/* V11__par_project_id_nullable_fix_take2.sql */

/* 0) FK 이름 확인
   - 대부분 'fk_par_project' 입니다.
   - 만약 다르면: SHOW CREATE TABLE professor_assignment_request; 로 실제 이름 확인 후 아래 이름만 바꿔주세요.
*/

/* 1) FK 먼저 드롭 */
ALTER TABLE professor_assignment_request
DROP FOREIGN KEY fk_par_project;

/* 2) project_id를 NULL 허용으로 변경 (정확히 BIGINT(20)로 맞춰줍니다) */
ALTER TABLE professor_assignment_request
    MODIFY COLUMN project_id BIGINT(20) NULL;

/* 3) FK 다시 추가 (ON DELETE SET NULL 옵션은 필요시 사용, 기본은 RESTRICT) */
ALTER TABLE professor_assignment_request
    ADD CONSTRAINT fk_par_project
        FOREIGN KEY (project_id) REFERENCES project(id);
-- 원하는 경우: ON DELETE SET NULL
