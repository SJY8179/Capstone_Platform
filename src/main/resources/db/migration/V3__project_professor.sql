ALTER TABLE project ADD COLUMN professor_id BIGINT NULL;
ALTER TABLE project
    ADD CONSTRAINT fk_project_professor
        FOREIGN KEY (professor_id) REFERENCES user_account(id);

-- (선택) 초기 데이터 세팅 예시
-- UPDATE project SET professor_id = (SELECT id FROM user_account WHERE email='prof@test.com') WHERE id IN (1,2,3);