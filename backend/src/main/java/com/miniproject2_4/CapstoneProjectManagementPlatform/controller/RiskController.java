package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.RiskDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Risk;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.RiskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.List;

import static com.miniproject2_4.CapstoneProjectManagementPlatform.util.DateTimes.parseFlexible;

@RestController
@RequiredArgsConstructor
public class RiskController {

    private final RiskService service;
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private UserAccount ensureUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UserAccount ua)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        // Java 17 패턴 변수 반환
        return (UserAccount) auth.getPrincipal();
    }

    private boolean canManage(UserAccount ua) {
        return ua.getRole() == Role.ADMIN || ua.getRole() == Role.PROFESSOR;
    }

    private RiskDto map(Risk r) {
        return new RiskDto(
                r.getId(),
                r.getProject().getId(),
                r.getTitle(),
                r.getImpact(),
                r.getLikelihood(),
                r.getMitigation(),
                r.getOwner(),
                r.getDueDate() == null ? null : r.getDueDate().format(ISO),
                r.getStatus().name(),
                r.getUpdatedAt() == null ? null : r.getUpdatedAt().format(ISO)
        );
    }

    @GetMapping("/projects/{projectId}/risks")
    public List<RiskDto> list(@PathVariable Long projectId) {
        return service.list(projectId).stream().map(this::map).toList();
    }

    public record CreateRiskReq(
            String title,
            Integer impact,
            Integer likelihood,
            String mitigation,
            String owner,
            String dueDate,
            String status
    ) {}

    /** 생성은 학생도 허용 */
    @PostMapping("/projects/{projectId}/risks")
    public RiskDto create(@PathVariable Long projectId, @RequestBody CreateRiskReq req, Authentication auth) {
        ensureUser(auth);
        Risk draft = Risk.builder()
                .title(req.title())
                .impact(req.impact() == null ? 3 : req.impact())
                .likelihood(req.likelihood() == null ? 3 : req.likelihood())
                .mitigation(req.mitigation())
                .owner(req.owner())
                .status(parseStatus(req.status()))
                .build();

        if (req.dueDate() != null && !req.dueDate().isBlank()) {
            draft.setDueDate(parseFlexible(req.dueDate()));
        }

        return map(service.create(projectId, draft));
    }

    public record PatchRiskReq(
            String title,
            Integer impact,
            Integer likelihood,
            String mitigation,
            String owner,
            String dueDate,
            String status
    ) {}

    /**
     * 수정은 학생도 허용.
     * 단, status 변경은 교수/관리자만 가능(학생이 보낸 status 값은 무시).
     */
    @PatchMapping("/risks/{riskId}")
    public RiskDto patch(@PathVariable Long riskId, @RequestBody PatchRiskReq req, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        boolean manager = canManage(ua);

        Risk p = new Risk();
        p.setTitle(req.title());
        if (req.impact() != null) p.setImpact(req.impact());
        if (req.likelihood() != null) p.setLikelihood(req.likelihood());
        p.setMitigation(req.mitigation());
        p.setOwner(req.owner());

        if (req.dueDate() != null && !req.dueDate().isBlank()) {
            p.setDueDate(parseFlexible(req.dueDate()));
        }

        if (manager && req.status() != null) {
            p.setStatus(parseStatus(req.status()));
        }
        // 학생이 status를 보내더라도 여기서 무시됨

        return map(service.patch(riskId, p));
    }

    /** 삭제는 교수/관리자만 */
    @DeleteMapping("/risks/{riskId}")
    public void delete(@PathVariable Long riskId, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        if (!canManage(ua)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "권한 없음");
        service.delete(riskId);
    }

    private Risk.Status parseStatus(String s) {
        if (s == null) return Risk.Status.OPEN;
        try {
            return Risk.Status.valueOf(s.toUpperCase());
        } catch (Exception ignore) {
            return Risk.Status.OPEN;
        }
    }
}
