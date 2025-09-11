package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.MemberReq;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.TeamListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.UserDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/teams") // context-path=/api 적용됨 → /api/teams
public class TeamController {
    private final TeamService teamService;

    /** (관리자/전체 조회) */
    @GetMapping
    public ResponseEntity<List<TeamListDto.Response>> listItems() {
        return ResponseEntity.ok(teamService.listTeams());
    }

    /** 내가 속한 팀만 */
    @GetMapping("/my")
    public ResponseEntity<List<TeamListDto.Response>> myTeams(@AuthenticationPrincipal UserAccount user) {
        return ResponseEntity.ok(teamService.listTeamsForUser(user.getId()));
    }

    /** 초대 가능한 유저 **/
    @GetMapping("/{teamId}/invitable-users")
    public ResponseEntity<List<UserDto>> getInvitableUsers(@PathVariable Long teamId) {
        return ResponseEntity.ok(teamService.findInvitableUsers(teamId));
    }

    /** 팀 생성 (로그인한 사용자 = 리더) **/
    @PostMapping
    public ResponseEntity<TeamListDto.Response> createTeam(
            @RequestBody TeamListDto.CreateRequest request,
            @AuthenticationPrincipal UserAccount user) {
        TeamListDto.Response newTeam = teamService.createTeam(request, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(newTeam);
    }

    /** 팀원 초대 (팀원 권한 필요) */
    @PostMapping("/{teamId}/members")
    public ResponseEntity<Void> addMember(
            @PathVariable Long teamId,
            @RequestBody MemberReq request,
            @AuthenticationPrincipal UserAccount requester
    ) {
        teamService.addMember(teamId, request.userId(), requester.getId());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /** 팀 정보 수정 (리더 권한 필요) */
    @PutMapping("/{teamId}")
    public ResponseEntity<TeamListDto.Response> updateTeam(
            @PathVariable Long teamId,
            @RequestBody @Valid TeamListDto.UpdateRequest request,
            @AuthenticationPrincipal UserAccount requester) {
        return ResponseEntity.ok(teamService.updateTeamInfo(teamId, request, requester.getId()));
    }

    /** 팀 리더 변경 (리더 권한 필요) */
    @PatchMapping("/{teamId}/leader")
    public ResponseEntity<Void> changeLeader(
            @PathVariable Long teamId,
            @RequestBody @Valid TeamListDto.ChangeLeaderRequest request,
            @AuthenticationPrincipal UserAccount requester) {
        teamService.changeLeader(teamId, request.newLeaderId(), requester.getId());
        return ResponseEntity.ok().build();
    }

    /** 팀원 삭제 (리더 권한 필요) */
    @DeleteMapping("/{teamId}/members/{memberId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long teamId,
            @PathVariable Long memberId,
            @AuthenticationPrincipal UserAccount requester) {
        teamService.removeMember(teamId, memberId, requester.getId());
        return ResponseEntity.noContent().build();
    }

    /** 팀 삭제 (리더 권한 필요) */
    @DeleteMapping("/{teamId}")
    public ResponseEntity<Void> deleteTeam(
            @PathVariable Long teamId,
            @AuthenticationPrincipal UserAccount requester) {
        teamService.deleteTeam(teamId, requester.getId());
        return ResponseEntity.noContent().build();
    }

//    private UserAccount getAuthenticatedUser(Authentication auth) {
//        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UserAccount user)) {
//            throw new AccessDeniedException("인증 정보가 유효하지 않습니다.");
//        }
//        return user;
//    }
}
