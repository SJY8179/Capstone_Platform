import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Plus, Users, UserPlus, Settings as SettingsIcon,
  MessageSquare, CalendarDays, GitBranch, CheckCircle2,
} from "lucide-react";
import type { UserRole } from "@/types/user";
import { listTeams, listTeachingTeams, listAllTeams } from "@/api/teams";
import type { TeamListDto, UserDto } from "@/types/domain";
import { CreateTeamModal } from "@/components/Teams/CreateTeamModal";
import { InviteMemberModal } from "@/components/Teams/InviteMemberModal";
import { TeamSettingsModal } from "@/components/Teams/TeamSettingsModal";
import { listInvitableUsers } from "@/types/user";

interface TeamManagementProps {
  userRole: UserRole;
}

function formatK(date?: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

export function TeamManagement({ userRole }: TeamManagementProps) {

  const [q, setQ] = useState("");
  const [teams, setTeams] = useState<TeamListDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamListDto | null>(null);

  const [users, setUsers] = useState<UserDto[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      let data: TeamListDto[] = [];
      if (userRole === "admin") {
        data = await listAllTeams(); // 관리자는 모든 팀 조회
      } else {
        data = await listTeams(); // 학생, 교수 모두 소속 팀만 조회 (/my 엔드포인트)
      }
      setTeams(data ?? []);
    } catch {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(qq) ||
        t.project.toLowerCase().includes(qq) ||
        t.members.some((m) => m.name.toLowerCase().includes(qq))
    );
  }, [teams, q]);

  async function loadUsersForInvite(teamId: number) {
    setLoadingUsers(true);
    try {
      const list = await listInvitableUsers(teamId);
      setUsers(list ?? []);
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }

  const openInvite = async (team: TeamListDto) => {
    setSelectedTeam(team);
    setShowInviteModal(true);
    await loadUsersForInvite(team.id);
  };

  const openSettings = (team: TeamListDto) => {
    setSelectedTeam(team);
    setShowSettingsModal(true);
  };

  const handleInviteSuccess = (teamId: number, newUser: UserDto) => {
    setTeams((prev) =>
      prev.map((t) =>
        t.id === teamId
          ? {
              ...t,
              members: [
                ...t.members,
                {
                  id: newUser.id,
                  name: newUser.name,
                  email: newUser.email,
                  role: "member",
                  status: "active",
                },
              ],
            }
          : t
      )
    );
  };

  const handleTeamUpdate = (updated: TeamListDto) => {
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleTeamDelete = (teamId: number) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">팀 관리</h1>
          <p className="text-muted-foreground">팀을 구성하고 협업을 진행하세요.</p>
        </div>
        {(userRole === "student" || userRole === "professor" || userRole === "admin") && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> 새 팀 생성
          </Button>
        )}
      </div>

      {/* 검색 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="팀명 또는 프로젝트명으로 검색…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-6">
        {filtered.map((t) => {
          const { stats } = t;
          return (
            <Card key={t.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {t.name}
                    <Badge variant="secondary">{t.project}</Badge>
                  </CardTitle>
                  <CardDescription>{t.description ?? "팀 소개가 없습니다."}</CardDescription>
                </div>

                {/* 카드별 액션 */}
                <div className="flex gap-2">
                  {(userRole === "student" || userRole === "professor" || userRole === "admin") && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openInvite(t)}>
                        <UserPlus className="h-4 w-4 mr-1" /> 팀원 초대
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openSettings(t)}>
                        <SettingsIcon className="h-4 w-4 mr-1" /> 팀 설정
                      </Button>
                    </>
                  )}
                  {userRole === "professor" && (
                    <>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="h-4 w-4 mr-1" /> 피드백
                      </Button>
                      <Button size="sm" variant="outline">
                        <CalendarDays className="h-4 w-4 mr-1" /> 일정 관리
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* 팀장 */}
                <div className="text-sm">
                  <span className="font-medium">팀장: </span>
                  {t.leader ? `${t.leader.name} (${t.leader.email})` : "미지정"}
                </div>

                {/* 멤버 목록 */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">팀원 ({t.members.length})</div>
                  <div className="divide-y rounded-md border">
                    {t.members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div className="text-sm">
                            <div className="font-medium">{m.name}</div>
                            <div className="text-muted-foreground">{m.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={m.role === "leader" ? "default" : "outline"}>
                            {m.role === "leader" ? "팀장" : "팀원"}
                          </Badge>
                          <Badge variant="outline">{m.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 활동 통계 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-md border p-4">
                    <div className="text-xs text-muted-foreground mb-1">총 커밋</div>
                    <div className="text-2xl font-semibold flex items-center gap-2">
                      <GitBranch className="h-5 w-5" />
                      {stats.commits}
                    </div>
                  </div>

                  <div className="rounded-md border p-4">
                    <div className="text-xs text-muted-foreground mb-1">회의 횟수</div>
                    <div className="text-2xl font-semibold flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      {stats.meetings}
                    </div>
                  </div>

                  <div className="rounded-md border p-4">
                    <div className="text-xs text-muted-foreground mb-1">완료/전체 작업</div>
                    <div className="text-2xl font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      {stats.tasks.completed}/{stats.tasks.total}
                    </div>
                  </div>
                </div>

                {/* 메타 */}
                <div className="text-xs text-muted-foreground">
                  생성일: {formatK(t.createdAt)} · 최근 활동: {formatK(t.lastActivity)}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-12">표시할 팀이 없습니다.</div>
        )}
      </div>

      {/* 모달들 */}
      <CreateTeamModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateSuccess={(newTeam) => {
          setTeams((prev) => [newTeam, ...prev]);
        }}
      />

      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        team={selectedTeam}
        users={users}
        isLoading={loadingUsers}
        onInviteSuccess={handleInviteSuccess}
      />

      <TeamSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        team={selectedTeam}
        onTeamUpdate={handleTeamUpdate}
        onTeamDelete={handleTeamDelete}
        onRefreshNeeded={loadTeams}
      />
    </div>
  );
}