package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.AdminUserDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.AdminUserSummaryDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.TeamMemberRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ProjectRepository projectRepository;

    public List<UserAccount> findAll() { return userRepository.findAll(); }

    public UserAccount get(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new java.util.NoSuchElementException("User not found: " + id));
    }

    /** 상위 N명 목록 (기본 100, 최대 500) */
    public List<UserAccount> findTop(Integer size) {
        int limit = clamp(size);
        return userRepository.findAll(PageRequest.of(0, limit)).getContent();
    }

    /** 이름/이메일 검색 (기본 100, 최대 500) */
    public List<UserAccount> searchTop(String q, Integer size) {
        int limit = clamp(size);
        return userRepository
                .findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(q, q)
                .stream()
                .limit(limit)
                .toList();
    }

    private int clamp(Integer size) {
        int s = (size == null) ? 100 : size;
        if (s < 1) s = 1;
        if (s > 500) s = 500;
        return s;
    }

    @Transactional
    public UserAccount create(UserAccount user) { return userRepository.save(user); }

    @Transactional
    public UserAccount update(Long id, String name, Role role) {
        UserAccount u = get(id);
        if (name != null) u.setName(name);
        if (role != null) u.setRole(role);
        return u;
    }

    @Transactional
    public void delete(Long id) { userRepository.deleteById(id); }

    /* ===================== 관리자 전용 ===================== */

    /** 상단 카드 집계 */
    public AdminUserSummaryDto getAdminUserSummary(int activeDays) {
        long total = userRepository.count();
        long students = userRepository.countByRole(Role.STUDENT);
        long professors = userRepository.countByRole(Role.PROFESSOR);
        LocalDateTime since = LocalDateTime.now().minusDays(Math.max(1, activeDays));
        long active = userRepository.countByLastLoginAtAfter(since);
        return new AdminUserSummaryDto(total, students, professors, active);
    }

    /** 사용자 목록/검색/역할 필터 */
    public List<AdminUserDto> getAdminUsers(String q, Role role, int page, int size, int activeDays) {
        int p = Math.max(0, page);
        int s = Math.min(Math.max(size, 1), 200);
        String qq = (q != null && !q.isBlank()) ? q.trim() : null;

        Page<UserAccount> rows = userRepository.search(qq, role, PageRequest.of(p, s));
        LocalDateTime activeSince = LocalDateTime.now().minusDays(Math.max(1, activeDays));

        return rows.stream().map(u -> {
            boolean active = u.getLastLoginAt() != null && u.getLastLoginAt().isAfter(activeSince);
            String recentProject = null;
            Integer taughtCount = null;

            if (u.getRole() == Role.STUDENT) {
                var titles = teamMemberRepository.findRecentProjectTitles(u.getId());
                recentProject = titles.stream().findFirst().orElse(null);
            } else if (u.getRole() == Role.PROFESSOR) {
                taughtCount = (int) projectRepository.countByProfessor_Id(u.getId());
            }

            return new AdminUserDto(
                    u.getId(),
                    u.getName(),
                    u.getEmail(),
                    u.getRole(),
                    u.getAvatarUrl(),
                    u.getCreatedAt(),
                    u.getLastLoginAt(),
                    active,
                    recentProject,
                    taughtCount
            );
        }).toList();
    }
}