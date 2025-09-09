-- 유저
INSERT INTO user_account(name,email,role,created_at,updated_at) VALUES
('김학생','kim@u.ac.kr','STUDENT', NOW(), NOW()),
('이학생','lee@u.ac.kr','STUDENT', NOW(), NOW()),
('박학생','park@u.ac.kr','STUDENT', NOW(), NOW()),
('최교수','choi@u.ac.kr','PROFESSOR', NOW(), NOW());

-- 팀
INSERT INTO team(name,created_at,updated_at) VALUES ('A-1팀', NOW(), NOW());

-- 팀원
INSERT INTO team_member(team_id,user_id,role_in_team) VALUES
(1,1,'LEADER'),(1,2,'MEMBER'),(1,3,'MEMBER'),(1,4,'MEMBER');

-- 프로젝트
INSERT INTO project(team_id,title,status,github_repo,repo_owner,created_at,updated_at)
VALUES (1,'캡스톤 플랫폼', 'ACTIVE', 'capstone-repo','a1team', NOW(), NOW());

-- 과제
INSERT INTO assignment(project_id,title,due_date,status,created_at,updated_at) VALUES
(1,'중간 보고서 제출', DATE_ADD(NOW(), INTERVAL 10 DAY), 'ONGOING', NOW(), NOW()),
(1,'프로토타입 데모', DATE_ADD(NOW(), INTERVAL 15 DAY), 'ONGOING', NOW(), NOW()),
(1,'최종 발표 준비', DATE_ADD(NOW(), INTERVAL 30 DAY), 'ONGOING', NOW(), NOW());

-- 이벤트(예약어 보호)
INSERT INTO `event`(project_id,title,start_at,end_at,location,type) VALUES
(1,'주간 스탠드업', DATE_FORMAT(NOW(),'%Y-%m-05 10:00:00'), DATE_FORMAT(NOW(),'%Y-%m-05 10:30:00'), '온라인','MEETING'),
(1,'중간 보고서 마감', DATE_FORMAT(NOW(),'%Y-%m-15 23:59:00'), DATE_FORMAT(NOW(),'%Y-%m-15 23:59:00'), '온라인 제출','DEADLINE');

-- 피드백
INSERT INTO feedback(project_id,author_id,content,created_at,updated_at) VALUES
(1,4,'제안서의 기술 스택 근거 보강 바랍니다.', NOW(), NOW()),
(1,4,'사용자 테스트 결과를 보고서에 추가하세요.', NOW(), NOW());
