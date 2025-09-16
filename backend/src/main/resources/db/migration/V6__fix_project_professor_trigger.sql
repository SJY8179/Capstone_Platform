-- MariaDB: Drop existing project triggers and recreate safe ones

-- 1) 모든 project 트리거 제거 (이름이 무엇이든 전부)
DROP PROCEDURE IF EXISTS sp_drop_project_triggers;
CREATE PROCEDURE sp_drop_project_triggers()
BEGIN
  DECLARE finished INT DEFAULT 0;
  DECLARE v_trig VARCHAR(255);
  DECLARE cur CURSOR FOR
SELECT TRIGGER_NAME
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
  AND EVENT_OBJECT_TABLE = 'project';
DECLARE CONTINUE HANDLER FOR NOT FOUND SET finished = 1;

OPEN cur;
drop_loop: LOOP
    FETCH cur INTO v_trig;
    IF finished = 1 THEN
      LEAVE drop_loop;
END IF;
    SET @sql = CONCAT('DROP TRIGGER IF EXISTS `', v_trig, '`');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
END LOOP;
CLOSE cur;
END;

CALL sp_drop_project_triggers();
DROP PROCEDURE IF EXISTS sp_drop_project_triggers;

-- 2) 안전한 트리거 재생성: professor_id가 설정된 경우에만 검증
CREATE TRIGGER trg_project_prof_check_bi
    BEFORE INSERT ON project
    FOR EACH ROW
BEGIN
    IF NEW.professor_id IS NOT NULL THEN
    IF (SELECT COUNT(*) FROM user_account ua
         WHERE ua.id = NEW.professor_id AND ua.role = 'PROFESSOR') = 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'project.professor_id must reference a PROFESSOR';
END IF;
END IF;
END;

CREATE TRIGGER trg_project_prof_check_bu
    BEFORE UPDATE ON project
    FOR EACH ROW
BEGIN
    IF NEW.professor_id IS NOT NULL THEN
    IF (SELECT COUNT(*) FROM user_account ua
         WHERE ua.id = NEW.professor_id AND ua.role = 'PROFESSOR') = 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'project.professor_id must reference a PROFESSOR';
END IF;
END IF;
END;