-- ����
INSERT INTO user_account(name,email,role,created_at,updated_at) VALUES
('���л�','kim@u.ac.kr','STUDENT', NOW(), NOW()),
('���л�','lee@u.ac.kr','STUDENT', NOW(), NOW()),
('���л�','park@u.ac.kr','STUDENT', NOW(), NOW()),
('�ֱ���','choi@u.ac.kr','PROFESSOR', NOW(), NOW());

-- ��
INSERT INTO team(name,created_at,updated_at) VALUES ('A-1��', NOW(), NOW());

-- ����
INSERT INTO team_member(team_id,user_id,role_in_team) VALUES
(1,1,'LEADER'),(1,2,'MEMBER'),(1,3,'MEMBER'),(1,4,'MEMBER');

-- ������Ʈ
INSERT INTO project(team_id,title,status,github_repo,repo_owner,created_at,updated_at)
VALUES (1,'ĸ���� �÷���', 'ACTIVE', 'capstone-repo','a1team', NOW(), NOW());

-- ����
INSERT INTO assignment(project_id,title,due_date,status,created_at,updated_at) VALUES
(1,'�߰� ���� ����', DATE_ADD(NOW(), INTERVAL 10 DAY), 'ONGOING', NOW(), NOW()),
(1,'������Ÿ�� ����', DATE_ADD(NOW(), INTERVAL 15 DAY), 'ONGOING', NOW(), NOW()),
(1,'���� ��ǥ �غ�', DATE_ADD(NOW(), INTERVAL 30 DAY), 'ONGOING', NOW(), NOW());

-- �̺�Ʈ(����� ��ȣ)
INSERT INTO `event`(project_id,title,start_at,end_at,location,type) VALUES
(1,'�ְ� ���ĵ��', DATE_FORMAT(NOW(),'%Y-%m-05 10:00:00'), DATE_FORMAT(NOW(),'%Y-%m-05 10:30:00'), '�¶���','MEETING'),
(1,'�߰� ���� ����', DATE_FORMAT(NOW(),'%Y-%m-15 23:59:00'), DATE_FORMAT(NOW(),'%Y-%m-15 23:59:00'), '�¶��� ����','DEADLINE');

-- �ǵ��
INSERT INTO feedback(project_id,author_id,content,created_at,updated_at) VALUES
(1,4,'���ȼ��� ��� ���� �ٰ� ���� �ٶ��ϴ�.', NOW(), NOW()),
(1,4,'����� �׽�Ʈ ����� ������ �߰��ϼ���.', NOW(), NOW());
