/* V10__par_project_id_nullable_fix.sql */

/*
  사전요청(pre-request)에서 project_id=NULL을 허용하기 위한 스키마 보정.
  1) project_id를 NULL 허용으로 변경
  2) (필요시) FK 재생성 — 보통은 재생성 없이도 NULL 허용 변경이 가능
*/

/* 1) project_id를 NULL 허용으로 */
ALTER TABLE professor_assignment_request
    MODIFY COLUMN project_id BIGINT NULL;

/*
-- 2) 만약 위 ALTER가 FK 제약 때문에 실패한다면, 아래 두 문장을 순서대로 실행(혹은 이 파일에 포함)하세요.
--    FK 이름은 최초 V8에서 'fk_par_project'로 만들었으니 그대로 사용합니다.
--    (실제 이름이 다르면 SHOW CREATE TABLE로 확인 후 수정)
*/
ALTER TABLE professor_assignment_request DROP FOREIGN KEY fk_par_project;
ALTER TABLE professor_assignment_request
    ADD CONSTRAINT fk_par_project FOREIGN KEY (project_id) REFERENCES project(id);

