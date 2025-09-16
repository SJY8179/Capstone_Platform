-- 알림 시스템을 위한 notifications 테이블 생성
-- 실행 방법: MariaDB/MySQL 콘솔에서 직접 실행하거나
-- 프로젝트 시작 시 schema.sql에 포함하여 자동 실행

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(120) NOT NULL,
    message VARCHAR(1000),
    link_url VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    read_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 효율적인 조회를 위한 인덱스 생성
CREATE INDEX idx_notification_recipient_read_created
ON notifications (recipient_id, is_read, created_at DESC);

-- 받는 사람별 인덱스
CREATE INDEX idx_notification_recipient_id
ON notifications (recipient_id);

-- 읽음 상태별 인덱스
CREATE INDEX idx_notification_is_read
ON notifications (is_read);

-- 생성일자별 인덱스
CREATE INDEX idx_notification_created_at
ON notifications (created_at DESC);

-- 샘플 데이터 (개발/테스트용)
INSERT INTO notifications (recipient_id, type, title, message, link_url, metadata) VALUES
(1, 'PROJECT_CREATED', '새로운 프로젝트가 생성되었습니다', '김철수님이 "캡스톤 프로젝트"를 생성했습니다.', '/projects/1', '{"projectId": 1, "projectName": "캡스톤 프로젝트"}'),
(1, 'PROJECT_ASSIGNED', '프로젝트에 배정되었습니다', '박교수님이 "AI 연구 프로젝트"에 귀하를 배정했습니다.', '/projects/2', '{"projectId": 2, "assignerId": 2}'),
(1, 'SYSTEM', '시스템 공지사항', '시스템 점검이 예정되어 있습니다.', '/notices/1', '{"noticeId": 1}');