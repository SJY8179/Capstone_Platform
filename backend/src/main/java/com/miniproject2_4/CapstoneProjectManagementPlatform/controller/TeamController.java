package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.MemberReq;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.TeamListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.UserDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
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
@RequestMapping(value = "/teams")
public class TeamController {
    private final TeamService teamService;

    /** (관리자 전용) 전체 팀 목록 */
    @GetMapping
    public ResponseEntity<List<TeamListDto.Response>> listItems(@AuthenticationPrincipal UserAccount user) {
        if (user == null || user.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_ALLOWED_TO_VIEW");
        }
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
            // 관리자는 전체 허용
            return ResponseEntity.ok(teamService.listTeams());
        }
        if (user.getRole() != Role.PROFESSOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_ALLOWED_TO_VIEW");
        }
        return ResponseEntity.ok(teamService.listTeamsForProfessor(user.getId()));
    }

    /** 초대 가능한 유저 **/
    @GetMapping("/{teamId}/invitable-users")
    public ResponseEntity<List<UserDto>> getInvitableUsers(@PathVariable Long teamId) {
        return ResponseEntity.ok(teamService.findInvitableUsers(teamId));
    }

    /** 모든 교수 목록 조회 */
    @GetMapping("/professors")
    public ResponseEntity<List<UserDto>> getAllProfessors() {
        return ResponseEntity.ok(teamService.getAllProfessors());
    }

    /** 팀에 교수 추가 */
    @PostMapping("/{teamId}/professors")
    public ResponseEntity<Void> addProfessorToTeam(
            @PathVariable Long teamId,
            @RequestBody MemberReq request,
            @AuthenticationPrincipal UserAccount requester) {
        teamService.addProfessorToTeam(teamId, request.userId(), requester.getId());
        return ResponseEntity.status(HttpStatus.CREATED).build();
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

    /** 팀의 교수 목록 조회 */
    @GetMapping("/{teamId}/professors")
    public ResponseEntity<List<UserDto>> listProfessors(@PathVariable Long teamId) {
        return ResponseEntity.ok(teamService.listTeamMembersByRole(teamId, Role.PROFESSOR));
    }

    /** 모든 팀에서 교수/강사 제거 (관리자 전용) */
    @DeleteMapping("/cleanup/professors-and-tas")
    public ResponseEntity<String> removeProfessorsAndTAs(@AuthenticationPrincipal UserAccount requester) {
        // 관리자만 실행 가능
        if (requester.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 실행할 수 있습니다.");
        }

        int removedCount = teamService.removeProfessorsAndTAsFromAllTeams();
        return ResponseEntity.ok(String.format("팀에서 %d명의 교수/강사가 제거되었습니다.", removedCount));
    }
}
