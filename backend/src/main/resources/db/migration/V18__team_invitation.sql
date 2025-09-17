CREATE TABLE IF NOT EXISTS team_invitation (
                                               id BIGINT PRIMARY KEY AUTO_INCREMENT,
                                               team_id BIGINT NOT NULL,
                                               inviter_id BIGINT NOT NULL,
                                               invitee_id BIGINT NOT NULL,
                                               status VARCHAR(16) NOT NULL,
    message VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at DATETIME NULL,
    INDEX idx_invitee_status (invitee_id, status),
    INDEX idx_team_status (team_id, status)
    );
