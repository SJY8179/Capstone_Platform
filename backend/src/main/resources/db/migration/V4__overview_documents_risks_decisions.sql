-- MariaDB / utf8mb4
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE IF NOT EXISTS project_overview (
                                                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                                project_id BIGINT NOT NULL,
                                                markdown LONGTEXT,
                                                status VARCHAR(20) NOT NULL,
    version INT NOT NULL,
    updated_by BIGINT NULL,
    updated_at DATETIME(6) NULL,
    pending_markdown LONGTEXT NULL,
    pending_author BIGINT NULL,
    pending_at DATETIME(6) NULL,
    CONSTRAINT uk_overview_project UNIQUE (project_id),
    CONSTRAINT fk_overview_project FOREIGN KEY (project_id) REFERENCES project(id),
    CONSTRAINT fk_overview_updated_by FOREIGN KEY (updated_by) REFERENCES user_account(id),
    CONSTRAINT fk_overview_pending_author FOREIGN KEY (pending_author) REFERENCES user_account(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS project_document (
                                                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                                project_id BIGINT NOT NULL,
                                                title VARCHAR(150) NOT NULL,
    url VARCHAR(500) NOT NULL,
    type VARCHAR(20) NOT NULL,
    created_by BIGINT NULL,
    created_at DATETIME(6) NOT NULL,
    INDEX idx_doc_project (project_id),
    CONSTRAINT fk_doc_project FOREIGN KEY (project_id) REFERENCES project(id),
    CONSTRAINT fk_doc_created_by FOREIGN KEY (created_by) REFERENCES user_account(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS risk (
                                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                    project_id BIGINT NOT NULL,
                                    title VARCHAR(200) NOT NULL,
    impact INT NOT NULL,
    likelihood INT NOT NULL,
    mitigation VARCHAR(500),
    owner VARCHAR(100),
    due_date DATETIME(6),
    status VARCHAR(20) NOT NULL,
    updated_at DATETIME(6),
    INDEX idx_risk_project (project_id),
    CONSTRAINT fk_risk_project FOREIGN KEY (project_id) REFERENCES project(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS decision (
                                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                        project_id BIGINT NOT NULL,
                                        title VARCHAR(200) NOT NULL,
    context VARCHAR(1000),
    options VARCHAR(1000),
    decision VARCHAR(1000),
    consequences VARCHAR(1000),
    decided_at DATETIME(6),
    decided_by BIGINT NULL,
    created_at DATETIME(6) NOT NULL,
    INDEX idx_decision_project (project_id),
    CONSTRAINT fk_decision_project FOREIGN KEY (project_id) REFERENCES project(id),
    CONSTRAINT fk_decision_decided_by FOREIGN KEY (decided_by) REFERENCES user_account(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS=1;