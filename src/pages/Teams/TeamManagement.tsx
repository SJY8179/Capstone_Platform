import React, { useState, useEffect, useMemo } from "react";
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
import type { UserRole } from "@/types/user";
import { listTeams, listTeachingTeams } from "@/api/teams";
import type { TeamListDto } from "@/types/domain";

interface TeamManagementProps {
  userRole: UserRole;
}

function formatK(date?: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

export function TeamManagement({ userRole }: TeamManagementProps) {
  // 관리자라면 이 페이지 대신 사용자 관리로 이동
  useEffect(() => {
    if (userRole === "admin") {
      window.location.assign("/admin/users");
    }
  }, [userRole]);

  if (userRole === "admin") {
    // 혹시 브라우저가 막히는 경우를 대비해 버튼도 제공
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">팀 관리</h1>
            <p className="text-muted-foreground">관리자는 사용자 관리 페이지로 이동합니다.</p>
          </div>
          <Button onClick={() => (window.location.href = "/admin/users")}>
            사용자 관리로 이동
          </Button>
        </div>
      </div>
    );
  }

  const [q, setQ] = useState("");
  const [teams, setTeams] = useState<TeamListDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        let data: TeamListDto[] = [];
        if (userRole === "professor") {
          // 교수: 담당 프로젝트의 팀
          data = await listTeachingTeams();
          // 담당 프로젝트가 없고, 본인이 팀 멤버인 팀도 보고 싶다면 아래 주석 해제
          // if (data.length === 0) data = await listTeams();
        } else {
          // 학생: 내가 속한 팀
          data = await listTeams();
        }
        setTeams(data ?? []);
      } catch {
        setTeams([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [userRole]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(qq) ||
        t.project.toLowerCase().includes(qq) ||
        t.members.some((m) => m.name.toLowerCase().includes(qq))
    );
  }, [teams, q]);

  const actions = (
    <>
      {userRole === "student" && (
        <>
          <Button size="sm" variant="outline">
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
          <Button>
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
                <div className="flex gap-2">{actions}</div>
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
    </div>
  );
}
