<<<<<<< HEAD
﻿import React, { useState, useEffect, useMemo } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
=======
﻿import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
<<<<<<< HEAD
  Search, Plus, Users, UserPlus, Settings, MessageSquare,
  CalendarDays, GitBranch, CheckCircle2,
} from "lucide-react";
import { UserRole } from "@/App";
import { listTeams, listInvitableUsers } from "@/api/teams";
import type { TeamListDto, UserDto } from "@/types/domain";
import { InviteMemberModal } from "@/components/modal/InviteMemberModal";
=======
  Search,
  Plus,
  Users,
  UserPlus,
  Settings,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { UserRole } from "@/App";
import { listTeams } from "@/api/teams";
import { listProjects } from "@/api/projects";
import type { TeamListDto, ProjectListDto } from "@/types/domain";
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938

interface TeamManagementProps {
  userRole: UserRole;
}

<<<<<<< HEAD
function formatK(date?: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

export function TeamManagement({ userRole }: TeamManagementProps) {
  const [q, setQ] = useState("");
  const [teams, setTeams] = useState<TeamListDto[]>([]);
  const [loading, setLoading] = useState(true);

  // modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamListDto | null>(null);
  const [invitableUsers, setInvitableUsers] = useState<UserDto[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listTeams();
        setTeams(data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(qq) ||
        t.project.toLowerCase().includes(qq) ||
        t.members.some((m) => m.name.toLowerCase().includes(qq))
    );
  }, [teams, q]);

  const handleOpenInviteModal = async (team: TeamListDto) => {
    setSelectedTeam(team);
    setIsInviteModalOpen(true);
    setIsUsersLoading(true);
    try {
      setInvitableUsers(await listInvitableUsers(team.id));
    } catch (error) {
      console.error("Failed to fetch invitable users:", error);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const handleCloseInviteModal = () => {
    setIsInviteModalOpen(false);
    setSelectedTeam(null);
    setInvitableUsers([]);
  };

  const actions = (team: TeamListDto) => (
    <>
      {userRole === "student" && (
        <>
          <Button size="sm" variant="outline" onClick={() => handleOpenInviteModal(team)}>
            <UserPlus className="h-4 w-4 mr-1" /> 팀원 초대
          </Button>
          <Button size="sm" variant="outline">
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
=======
export function TeamManagement({ userRole }: TeamManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [teams, setTeams] = useState<TeamListDto[]>([]);
  const [projects, setProjects] = useState<ProjectListDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [teamData, projectData] = await Promise.all([
          listTeams(),
          listProjects(),
        ]);
        setTeams(teamData);
        setProjects(projectData);
      } catch (error) {
        console.error("Failed to fetch team data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getProjectName = (projectId?: number) => {
    return projects.find((p) => p.id === projectId)?.name ?? "프로젝트 정보 없음";
  };

  const filteredTeams = teams.filter((team) => {
    const projectName = getProjectName(team.projectId).toLowerCase();
    const teamName = team.name?.toLowerCase() ?? "";
    const query = searchQuery.toLowerCase();
    return teamName.includes(query) || projectName.includes(query);
  });

  const renderTeamActions = () => {
    if (userRole === "student") {
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            팀원 초대
          </Button>
          <Button size="sm" variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            팀 설정
          </Button>
        </div>
      );
    } else if (userRole === "professor") {
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            피드백
          </Button>
          <Button size="sm" variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            일정 관리
          </Button>
        </div>
      );
    } else {
      // admin
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            설정
          </Button>
        </div>
      );
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">팀 관리</h1>
<<<<<<< HEAD
          <p className="text-muted-foreground">팀을 구성하고 협업을 진행하세요.</p>
        </div>
        {userRole === "student" && (
          <Button>
            <Plus className="h-4 w-4 mr-2" /> 새 팀 생성
=======
          <p className="text-muted-foreground">
            {userRole === "student"
              ? "팀을 구성하고 협업을 진행하세요."
              : userRole === "professor"
              ? "담당 팀들을 관리하고 지도하세요."
              : "전체 팀 현황을 확인하고 관리하세요."}
          </p>
        </div>
        {userRole === "student" && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            새 팀 생성
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
          </Button>
        )}
      </div>

      {/* 검색 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="팀명 또는 프로젝트명으로 검색…"
<<<<<<< HEAD
          value={q}
          onChange={(e) => setQ(e.target.value)}
=======
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
          className="pl-10"
        />
      </div>

<<<<<<< HEAD
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

        <InviteMemberModal
          isOpen={isInviteModalOpen}
          onClose={handleCloseInviteModal}
          team={selectedTeam}
          users={invitableUsers}
          isLoading={isUsersLoading}
        />
        {!loading && filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-12">표시할 팀이 없습니다.</div>
        )}
      </div>
    </div>
  );
}
=======
      {/* 팀 목록 */}
      <div className="grid gap-6">
        {filteredTeams.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-lg">
                      {team.name ?? "이름 없음"}
                    </CardTitle>
                    <Badge variant="outline">
                      {team.memberCount ?? 0}명
                    </Badge>
                  </div>
                  <CardDescription className="text-base font-medium">
                    {getProjectName(team.projectId)}
                  </CardDescription>
                </div>
                {renderTeamActions()}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2" />
                <p>
                  팀 상세 정보(팀원, 역할, 활동 등)를 표시하려면
                  <br />
                  추가 API 연동이 필요합니다.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            검색 조건에 맞는 팀이 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
