package com.miniproject2_4.CapstoneProjectManagementPlatform.util;

import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.MembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
@RequiredArgsConstructor
public class ProjectAccessGuard {

    private final MembershipRepository membershipRepository;

    public void assertMember(Long projectId, Long userId) {
        if (projectId == null || userId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "프로젝트 접근 권한이 없습니다.");
        }
        if (!membershipRepository.existsMembership(projectId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "프로젝트 멤버가 아닙니다.");
        }
    }
}