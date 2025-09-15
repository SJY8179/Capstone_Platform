package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.DecisionDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Decision;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.DecisionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static com.miniproject2_4.CapstoneProjectManagementPlatform.util.DateTimes.parseFlexible;

@RestController
@RequiredArgsConstructor
public class DecisionController {

    private final DecisionService service;
    private final UserRepository userRepository;
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private UserAccount ensureUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UserAccount ua)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        return (UserAccount) auth.getPrincipal();
    }

    private boolean canManage(UserAccount ua) {
        return ua.getRole() == Role.ADMIN || ua.getRole() == Role.PROFESSOR;
    }

    private DecisionDto map(Decision d) {
        var by = d.getDecidedBy() == null ? null
                : new DecisionDto.SimpleUser(d.getDecidedBy().getId(), d.getDecidedBy().getName());
        return new DecisionDto(
                d.getId(),
                d.getProject().getId(),
                d.getTitle(),
                d.getContext(),
                d.getOptions(),
                d.getDecision(),
                d.getConsequences(),
                d.getDecidedAt() == null ? null : d.getDecidedAt().format(ISO),
                by,
                d.getCreatedAt() == null ? null : d.getCreatedAt().format(ISO)
        );
    }

    @GetMapping("/projects/{projectId}/decisions")
    public List<DecisionDto> list(@PathVariable Long projectId) {
        return service.list(projectId).stream().map(this::map).toList();
    }

    public record CreateDecisionReq(
            String title,
            String context,
            String options,
            String decision,
            String consequences
    ) {}

    /** 생성은 학생도 허용 */
    @PostMapping("/projects/{projectId}/decisions")
    public DecisionDto create(@PathVariable Long projectId, @RequestBody CreateDecisionReq req, Authentication auth) {
        ensureUser(auth);
        Decision d = Decision.builder()
                .title(req.title())
                .context(req.context())
                .options(req.options())
                .decision(req.decision())
                .consequences(req.consequences())
                .createdAt(LocalDateTime.now())
                .build();
        return map(service.create(projectId, d));
    }

    public record PatchDecisionReq(
            String title,
            String context,
            String options,
            String decision,
            String consequences,
            String decidedAt,
            Long decidedById
    ) {}

    /** 수정/삭제는 교수/관리자만 */
    @PatchMapping("/decisions/{id}")
    public DecisionDto patch(@PathVariable Long id, @RequestBody PatchDecisionReq req, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        if (!canManage(ua)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "권한 없음");

        Decision p = new Decision();
        p.setTitle(req.title());
        p.setContext(req.context());
        p.setOptions(req.options());
        p.setDecision(req.decision());
        p.setConsequences(req.consequences());

        if (req.decidedAt() != null && !req.decidedAt().isBlank()) {
            p.setDecidedAt(parseFlexible(req.decidedAt()));
        }
        if (req.decidedById() != null) {
            var by = userRepository.findById(req.decidedById()).orElse(null);
            p.setDecidedBy(by);
        }

        return map(service.patch(id, p));
    }

    @DeleteMapping("/decisions/{id}")
    public void delete(@PathVariable Long id, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        if (!canManage(ua)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "권한 없음");
        service.delete(id);
    }
}