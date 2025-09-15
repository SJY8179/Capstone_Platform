package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.AnnouncementRequest;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.MemberReq;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.TeamListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.InvitableUserDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamInvitation;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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

    /** (교수 전용) 내가 '담당 교수'인 프로젝트의 팀 */
    @GetMapping("/teaching")
    public ResponseEntity<List<TeamListDto.Response>> teaching(@AuthenticationPrincipal UserAccount user) {
        if (user.getRole() == Role.ADMIN) {
            // 관리자는 전체 허용 (요청/정책에 따라 조정 가능)
            return ResponseEntity.ok(teamService.listTeams());
        }
        if (user.getRole() != Role.PROFESSOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_ALLOWED_TO_VIEW");
        }
        return ResponseEntity.ok(teamService.listTeamsForProfessor(user.getId()));
    }

    /** 초대 가능한 유저(교수, 관리자 제외) **/
    @GetMapping("/{teamId}/invitable-users")
    public ResponseEntity<List<InvitableUserDto>> getInvitableUsers(@PathVariable Long teamId) {
        return ResponseEntity.ok(teamService.findInvitableUsers(teamId));
    }

    /** 팀 생성 (로그인한 사용자 = 팀장) **/
    @PostMapping
    public ResponseEntity<TeamListDto.Response> createTeam(
            @RequestBody TeamListDto.CreateRequest request,
            @AuthenticationPrincipal UserAccount user) {
        TeamListDto.Response newTeam = teamService.createTeam(request, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(newTeam);
    }

    /** 팀원 초대 보내기 (팀원 권한) */
    @PostMapping("/{teamId}/invitations")
    public ResponseEntity<Void> inviteMember(
            @PathVariable Long teamId,
            @RequestBody MemberReq request,
            @AuthenticationPrincipal UserAccount requester
    ) {
        teamService.inviteMember(teamId, request.userId(), requester.getId());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /** 팀원 초대 응답 (수락/거절) */
    @PostMapping("/invitations/{invitationId}")
    public ResponseEntity<TeamInvitation> respondToInvitation(
            @PathVariable Long invitationId,
            @RequestParam boolean accept,
            @AuthenticationPrincipal UserAccount invitee
    ) {
        TeamInvitation updatedInvitation = teamService.respondToInvitation(invitationId, accept, invitee.getId());
        return ResponseEntity.ok(updatedInvitation);
    }

    /** 공지 보내기（교수）*/
    @PostMapping("/{teamId}/announcements")
    public ResponseEntity<Void> sendAnnouncement(
            @PathVariable Long teamId,
            @Valid @RequestBody AnnouncementRequest request,
            @AuthenticationPrincipal UserAccount professor
    ) {
        teamService.sendAnnouncementToTeam(teamId, request, professor.getId());
        return ResponseEntity.ok().build();
    }

    /** 팀 정보 수정 (팀장 권한 필요) */
    @PutMapping("/{teamId}")
    public ResponseEntity<TeamListDto.Response> updateTeam(
            @PathVariable Long teamId,
            @RequestBody @Valid TeamListDto.UpdateRequest request,
            @AuthenticationPrincipal UserAccount requester) {
        return ResponseEntity.ok(teamService.updateTeamInfo(teamId, request, requester.getId()));
    }

    /** 팀 리더 변경 (팀장 권한 필요) */
    @PatchMapping("/{teamId}/leader")
    public ResponseEntity<Void> changeLeader(
            @PathVariable Long teamId,
            @RequestBody @Valid TeamListDto.ChangeLeaderRequest request,
            @AuthenticationPrincipal UserAccount requester) {
        teamService.changeLeader(teamId, request.newLeaderId(), requester.getId());
        return ResponseEntity.ok().build();
    }

    /** 팀원 삭제 (팀장 권한 필요) */
    @DeleteMapping("/{teamId}/members/{memberId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long teamId,
            @PathVariable Long memberId,
            @AuthenticationPrincipal UserAccount requester) {
        teamService.removeMember(teamId, memberId, requester.getId());
        return ResponseEntity.noContent().build();
    }

    /** 팀 삭제 (팀장 권한 필요) */
    @DeleteMapping("/{teamId}")
    public ResponseEntity<Void> deleteTeam(
            @PathVariable Long teamId,
            @AuthenticationPrincipal UserAccount requester) {
        teamService.deleteTeam(teamId, requester.getId());
        return ResponseEntity.noContent().build();
    }
}
