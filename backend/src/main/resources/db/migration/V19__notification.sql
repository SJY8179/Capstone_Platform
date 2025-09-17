CREATE TABLE IF NOT EXISTS notification (
                                            id BIGINT PRIMARY KEY AUTO_INCREMENT,
                                            recipient_id BIGINT NOT NULL,
                                            type VARCHAR(32) NOT NULL,
    title VARCHAR(120) NOT NULL,
    body TEXT NULL,
    payload TEXT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_recipient_read (recipient_id, is_read),
    INDEX idx_recipient_created (recipient_id, created_at)
    );
