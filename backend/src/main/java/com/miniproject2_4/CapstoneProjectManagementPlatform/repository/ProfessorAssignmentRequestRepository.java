package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.ProfessorAssignmentRequest;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.ProfessorAssignmentRequest.Status;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProfessorAssignmentRequestRepository extends JpaRepository<ProfessorAssignmentRequest, Long> {

    /** 특정 교수의 대기중 요청 */
    List<ProfessorAssignmentRequest> findByTargetProfessor_IdAndStatusOrderByCreatedAtDesc(Long professorId, Status status);

    /** 동일 프로젝트에서 진행중(PENDING) 요청 존재 여부 (사후요청 중복 방지) */
    boolean existsByProject_IdAndStatus(Long projectId, Status status);

    /** 동일 팀/제목에서 진행중(PENDING) 사전요청 존재 여부 (사전요청 중복 방지) */
    boolean existsByTeam_IdAndTitleIgnoreCaseAndStatus(Long teamId, String title, Status status);

    /** 특정 프로젝트의 요청들 (필요시) */
    List<ProfessorAssignmentRequest> findByProject_IdOrderByCreatedAtDesc(Long projectId);
}
