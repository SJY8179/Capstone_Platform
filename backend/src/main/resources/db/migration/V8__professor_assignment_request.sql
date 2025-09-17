-- 요청 테이블 (최초 생성)
CREATE TABLE IF NOT EXISTS professor_assignment_request (
                                                            id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                                                            project_id BIGINT NULL,
                                                            team_id BIGINT NOT NULL,
                                                            requested_by BIGINT NOT NULL,
                                                            target_professor BIGINT NOT NULL,
                                                            status VARCHAR(20) NOT NULL,
    message LONGTEXT NULL,
    title VARCHAR(200) NOT NULL,
    decided_by BIGINT NULL,
    decided_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_par_project       FOREIGN KEY (project_id)     REFERENCES project(id),
    CONSTRAINT fk_par_team          FOREIGN KEY (team_id)        REFERENCES team(id),
    CONSTRAINT fk_par_requested_by  FOREIGN KEY (requested_by)   REFERENCES user_account(id),
    CONSTRAINT fk_par_target_prof   FOREIGN KEY (target_professor) REFERENCES user_account(id),
    CONSTRAINT fk_par_decided_by    FOREIGN KEY (decided_by)     REFERENCES user_account(id)
    );

CREATE INDEX idx_par_project          ON professor_assignment_request(project_id);
CREATE INDEX idx_par_team             ON professor_assignment_request(team_id);
CREATE INDEX idx_par_target_professor ON professor_assignment_request(target_professor);
CREATE INDEX idx_par_status           ON professor_assignment_request(status);
