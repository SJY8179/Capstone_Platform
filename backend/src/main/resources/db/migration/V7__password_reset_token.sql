-- 비밀번호 재설정 토큰 테이블
CREATE TABLE password_reset_token (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    created_ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- 토큰 해시로 빠른 조회를 위한 인덱스
CREATE INDEX idx_password_reset_token_hash ON password_reset_token(token_hash);

-- 사용자별 만료 시간 조회를 위한 복합 인덱스
CREATE INDEX idx_password_reset_token_user_expires ON password_reset_token(user_id, expires_at);

-- 만료된 토큰 정리를 위한 인덱스
CREATE INDEX idx_password_reset_token_expires_used ON password_reset_token(expires_at, used);