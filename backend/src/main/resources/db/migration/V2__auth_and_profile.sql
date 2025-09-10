ALTER TABLE event MODIFY COLUMN end_at DATETIME NULL;

-- 인증/프로필 확장 및 세션(리프레시 토큰) 테이블
-- 1) user_account 컬럼 추가
ALTER TABLE user_account
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL AFTER email,
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS last_login_at DATETIME NULL;

-- 2) auth_session 테이블
CREATE TABLE IF NOT EXISTS auth_session (
                                            id BIGINT PRIMARY KEY AUTO_INCREMENT,
                                            user_id BIGINT NOT NULL,
                                            refresh_token VARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    CONSTRAINT fk_auth_session_user
    FOREIGN KEY (user_id) REFERENCES user_account(id)
    ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;