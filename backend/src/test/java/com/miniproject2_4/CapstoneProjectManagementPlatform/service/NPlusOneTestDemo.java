package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@SpringBootTest
@ActiveProfiles("test")
public class NPlusOneTestDemo {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private DashboardService dashboardService;

    @Test
    @Transactional
    public void demonstrateNPlusOneProblem() {
        System.out.println("=== N+1 쿼리 문제 데모 ===");

        // 테스트 데이터 생성
        UserAccount professor = createTestProfessor();
        List<Project> projects = createTestProjects(professor, 5);
        createTestAssignments(projects);

        System.out.println("\n--- 최적화 전 (N+1 문제) ---");
        long startTime = System.currentTimeMillis();

        // N+1 패턴 시뮬레이션
        simulateNPlusOneProblem(projects);

        long nPlusOneTime = System.currentTimeMillis() - startTime;
        System.out.println("최적화 전 실행 시간: " + nPlusOneTime + "ms");

        System.out.println("\n--- 최적화 후 (Batch 조회) ---");
        startTime = System.currentTimeMillis();

        // 최적화된 방식
        demonstrateOptimizedApproach(professor.getId());

        long optimizedTime = System.currentTimeMillis() - startTime;
        System.out.println("최적화 후 실행 시간: " + optimizedTime + "ms");

        System.out.println("\n=== 성능 개선 결과 ===");
        System.out.println("개선율: " + ((double)(nPlusOneTime - optimizedTime) / nPlusOneTime * 100) + "%");
    }

    private void simulateNPlusOneProblem(List<Project> projects) {
        System.out.println("🔴 N+1 쿼리 패턴:");
        int queryCount = 1; // 초기 프로젝트 조회

        for (Project p : projects) {
            // 각 프로젝트마다 별도 쿼리 (N+1 문제)
            List<Assignment> assignments = assignmentRepository.findByProject_IdOrderByDueDateAsc(p.getId());
            queryCount++;
            System.out.println("  프로젝트 " + p.getId() + ": " + assignments.size() + "개 과제 조회");
        }

        System.out.println("총 쿼리 수: " + queryCount + "개 (1 + " + projects.size() + ")");
    }

    private void demonstrateOptimizedApproach(Long professorId) {
        System.out.println("🟢 최적화된 Batch 조회:");

        // DashboardService의 최적화된 로직 사용
        var summary = dashboardService.getProfessorSummary(professorId);

        System.out.println("총 쿼리 수: 3개 (프로젝트 조회 + Batch Assignment 조회 + 집계)");
        System.out.println("결과: " + summary.metrics().runningTeams() + "개 팀, " +
                          summary.metrics().pendingReviews() + "개 대기 리뷰");
    }

    private UserAccount createTestProfessor() {
        UserAccount professor = new UserAccount();
        professor.setName("테스트 교수");
        professor.setEmail("professor.test@test.com");
        professor.setPasswordHash("test");
        professor.setRole(Role.PROFESSOR);
        return userRepository.save(professor);
    }

    private List<Project> createTestProjects(UserAccount professor, int count) {
        List<Project> projects = new java.util.ArrayList<>();

        for (int i = 1; i <= count; i++) {
            Project project = new Project();
            project.setTitle("테스트 프로젝트 " + i);
            project.setProfessor(professor);
            project.setStatus(Project.Status.ACTIVE);
            project.setArchived(false);
            projects.add(projectRepository.save(project));
        }

        return projects;
    }

    private void createTestAssignments(List<Project> projects) {
        for (Project project : projects) {
            for (int i = 1; i <= 3; i++) {
                Assignment assignment = new Assignment();
                assignment.setProject(project);
                assignment.setTitle("과제 " + i + " (프로젝트 " + project.getId() + ")");
                assignment.setDueDate(LocalDateTime.now().plusDays(i * 7));
                assignment.setStatus(AssignmentStatus.PENDING);
                assignmentRepository.save(assignment);
            }
        }
    }
}