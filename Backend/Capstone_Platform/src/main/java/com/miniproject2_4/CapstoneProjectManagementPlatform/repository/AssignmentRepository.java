package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Assignment;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.AssignmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {

    List<Assignment> findByProject_Id(Long projectId);

    List<Assignment> findByProject_IdOrderByDueDateAsc(Long projectId);

    long countByProject_Id(Long projectId);

    long countByProject_IdAndStatus(Long projectId, AssignmentStatus status);

    // 향후 대시보드/알림에 사용할 수 있는 다가오는 과제 Top-N
    List<Assignment> findTop5ByProject_IdAndStatusInAndDueDateAfterOrderByDueDateAsc(
            Long projectId,
            List<AssignmentStatus> statuses,
            LocalDateTime now
    );
}
