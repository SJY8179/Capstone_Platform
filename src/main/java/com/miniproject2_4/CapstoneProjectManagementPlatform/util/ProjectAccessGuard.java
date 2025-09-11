package com.miniproject2_4.CapstoneProjectManagementPlatform.util;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.MembershipRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
@RequiredArgsConstructor
public class ProjectAccessGuard {

    private final MembershipRepository membershipRepository;
    private final ProjectRepository projectRepository;

    /** (레거시) 프로젝트 멤버인지 단순 체크 */
    public void assertMember(Long projectId, Long userId) {
        if (projectId == null || userId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_ALLOWED_TO_VIEW");
        }
        if (!membershipRepository.existsMembership(projectId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_PROJECT_MEMBER");
        }
    }

    /** 조회 권한: ADMIN || (PROFESSOR && 담당교수) || (팀 멤버) */
    public void assertCanViewProject(Long projectId, UserAccount user) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        Long userId = user.getId();
        Role role = user.getRole();

        if (role == Role.ADMIN) return;
        if (role == Role.PROFESSOR && isProfessorOfProject(projectId, userId)) return;
        if (isMember(projectId, userId)) return;

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_ALLOWED_TO_VIEW");
    }

    /** 이벤트 생성/수정/삭제 권한: ADMIN || (PROFESSOR && 담당교수) || (STUDENT && 팀 멤버) */
    public void assertCanManageEvents(Long projectId, UserAccount user) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        Long userId = user.getId();
        Role role = user.getRole();

        if (role == Role.ADMIN) return;
        if (role == Role.PROFESSOR && isProfessorOfProject(projectId, userId)) return;
        if (role == Role.STUDENT && isMember(projectId, userId)) return;

        if (role == Role.PROFESSOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_PROJECT_PROFESSOR");
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_PROJECT_MEMBER");
        }
    }

    private boolean isMember(Long projectId, Long userId) {
        if (projectId == null || userId == null) return false;
        return membershipRepository.existsMembership(projectId, userId);
    }

    private boolean isProfessorOfProject(Long projectId, Long userId) {
        if (projectId == null || userId == null) return false;
        return projectRepository.existsByIdAndProfessor_Id(projectId, userId);
    }
}
