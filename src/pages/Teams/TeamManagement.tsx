import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Plus, Users, UserPlus, Settings, MessageSquare,
  CalendarDays, GitBranch, CheckCircle2,
} from "lucide-react";
import { UserRole } from "@/types/user";
import { listTeams, listInvitableUsers } from "@/api/teams";
import type { TeamListDto, UserDto } from "@/types/domain";
import { InviteMemberModal } from "@/components/Teams/InviteMemberModal";
import { CreateTeamModal } from "@/components/Teams/CreateTeamModal";
import { TeamSettingsModal } from "@/components/Teams/TeamSettingsModal";

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

  // modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // data state
  const [selectedTeam, setSelectedTeam] = useState<TeamListDto | null>(null);
  const [invitableUsers, setInvitableUsers] = useState<UserDto[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTeams();
      setTeams(data ?? []);
    } catch (error) {
      console.error("팀 목록을 불러오는 데 실패했습니다:", error);
      // TODO: 사용자에게 에러 토스트 메시지 표시
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase().replace(/\s/g, '');
    if (!qq) return teams;
    return teams.filter(t =>
      t.name.toLowerCase().replace(/\s/g, '').includes(qq) ||
      t.project.toLowerCase().replace(/\s/g, '').includes(qq) ||
      t.members.some(m => m.name.toLowerCase().replace(/\s/g, '').includes(qq))
    );
  }, [teams, q]);

  const handleOpenInviteModal = async (team: TeamListDto) => {
    setSelectedTeam(team);
    setIsInviteModalOpen(true);
    setIsUsersLoading(true);
    try {
      setInvitableUsers(await listInvitableUsers(team.id));
    } catch (error) {
      console.error("[초대 가능 사용자 목록 조회 실패]Failed to fetch team member list:", error);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const handleOpenSettingsModal = (team: TeamListDto) => {
    setSelectedTeam(team);
    setIsSettingsModalOpen(true);
  };

  const handleCreateSuccess = (newTeam: TeamListDto) => {
    setTeams(currentTeams => [newTeam, ...currentTeams]);
  };

  const handleTeamUpdate = (updatedTeam: TeamListDto) => {
    setTeams(currentTeams => currentTeams.map(t => t.id === updatedTeam.id ? updatedTeam : t));
  };

  const handleTeamDelete = (teamId: number) => {
    setTeams(currentTeams => currentTeams.filter(t => t.id !== teamId));
  };

  const actions = (team: TeamListDto) => (
    <>
      {userRole === "student" && (
        <>
          <Button size="sm" variant="outline" onClick={() => handleOpenInviteModal(team)}>
            <UserPlus className="h-4 w-4 mr-1" /> 팀원 초대
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleOpenSettingsModal(team)}>
            <Settings className="h-4 w-4 mr-1" /> 팀 설정
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
      {userRole === "admin" && (
        <Button size="sm" variant="outline">
          <Settings className="h-4 w-4 mr-1" /> 설정
        </Button>
      )}
    </>
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">팀 관리</h1>
          <p className="text-muted-foreground">팀을 구성하고 협업을 진행하세요.</p>
        </div>
        {userRole === "student" && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
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

      {/* 팀 목록 */}
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
                  <CardDescription>{t.description || "팀 소개가 없습니다."}</CardDescription>
                </div>
                <div className="flex gap-2">{actions(t)}</div>
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
                      {stats?.commits ?? 0}
                    </div>
                  </div>

                  <div className="rounded-md border p-4">
                    <div className="text-xs text-muted-foreground mb-1">회의 횟수</div>
                    <div className="text-2xl font-semibold flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      {stats?.meetings ?? 0}
                    </div>
                  </div>

                  <div className="rounded-md border p-4">
                    <div className="text-xs text-muted-foreground mb-1">완료/전체 작업</div>
                    <div className="text-2xl font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      {stats?.tasks?.completed ?? 0}/{stats?.tasks?.total ?? 0}
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

      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateSuccess={handleCreateSuccess}
      />
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => { setIsInviteModalOpen(false); setSelectedTeam(null); }}
        team={selectedTeam}
        users={invitableUsers}
        isLoading={isUsersLoading}
        onInviteSuccess={fetchTeams}
      />
      <TeamSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => { setIsSettingsModalOpen(false); setSelectedTeam(null); }}
        team={selectedTeam}
        onTeamUpdate={handleTeamUpdate}
        onTeamDelete={handleTeamDelete}
        onRefreshNeeded={fetchTeams}
      />
    </div >
  );
}