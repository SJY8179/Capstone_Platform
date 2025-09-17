-- project_id 를 NULL 허용으로 변경
ALTER TABLE professor_assignment_request
    MODIFY COLUMN project_id BIGINT NULL;

-- team_id / title 컬럼이 없으면 추가
ALTER TABLE professor_assignment_request
    ADD COLUMN IF NOT EXISTS team_id BIGINT NOT NULL AFTER project_id;

ALTER TABLE professor_assignment_request
    ADD COLUMN IF NOT EXISTS title VARCHAR(200) NOT NULL AFTER message;

-- FK/INDEX (없을 때만 추가 시도)
ALTER TABLE professor_assignment_request
    ADD CONSTRAINT fk_par_team FOREIGN KEY (team_id) REFERENCES team(id);

CREATE INDEX IF NOT EXISTS idx_par_team ON professor_assignment_request(team_id);
