/* 예: V2__user_extras.sql (이미 있으면 건너뜀) */

ALTER TABLE user_account
    ADD COLUMN IF NOT EXISTS password_hash  VARCHAR(255)   NULL,
    ADD COLUMN IF NOT EXISTS avatar_url     VARCHAR(500)   NULL,
    ADD COLUMN IF NOT EXISTS last_login_at  DATETIME(6)    NULL;

CREATE TABLE IF NOT EXISTS auth_session (
                                            id            BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                                            user_id       BIGINT NOT NULL,
                                            token         VARCHAR(255) NOT NULL,
    created_at    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    expires_at    DATETIME(6) NULL,
    CONSTRAINT fk_auth_session_user FOREIGN KEY (user_id) REFERENCES user_account(id)
    );

-- 인덱스도 정보 스키마로 체크 후 생성
SET @sess_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'auth_session'
    AND INDEX_NAME   = 'idx_auth_session_user'
);
SET @ddl_sess_idx := IF(@sess_idx = 0,
  'CREATE INDEX idx_auth_session_user ON auth_session(user_id)',
  'SELECT 1');
PREPARE s FROM @ddl_sess_idx;
EXECUTE s;
DEALLOCATE PREPARE s;
