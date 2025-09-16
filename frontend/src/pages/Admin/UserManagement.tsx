import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Plus, Users, UserCheck, Settings, Mail, Phone, Calendar, Filter,
} from "lucide-react";
import { getAdminUsers, getAdminUsersSummary } from "@/api/users";
import type { AdminUser, AdminUserSummary } from "@/types/domain";

export function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"all" | "student" | "professor">("all");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [summary, setSummary] = useState<AdminUserSummary | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [sum, list] = await Promise.all([
          getAdminUsersSummary(30),
          getAdminUsers({
            q: searchQuery || undefined,
            role: selectedTab === "all" ? undefined : (selectedTab === "student" ? "STUDENT" : "PROFESSOR"),
            page: 0,
            size: 100,
            activeDays: 30,
          }),
        ]);
        setSummary(sum);
        setRows(list);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [searchQuery, selectedTab]);

  const userStats = useMemo(() => ({
    total: summary?.totalUsers ?? 0,
    students: summary?.totalStudents ?? 0,
    professors: summary?.totalProfessors ?? 0,
    active: summary?.activeUsers ?? 0,
  }), [summary]);

  const getRoleBadge = (role: AdminUser["role"]) => {
    switch (role) {
      case "ADMIN": return <Badge variant="destructive">관리자</Badge>;
      case "PROFESSOR": return <Badge variant="default">교수</Badge>;
      case "STUDENT": return <Badge variant="secondary">학생</Badge>;
      case "TA": return <Badge variant="outline">조교</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (active: boolean) => {
    return active
      ? <Badge variant="default" className="bg-green-100 text-green-800">활성</Badge>
      : <Badge variant="outline">비활성</Badge>;
  };

  const format = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("ko-KR");
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">사용자 관리</h1>
          <p className="text-muted-foreground">시스템 사용자를 관리하고 권한을 설정하세요</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            필터
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            사용자 추가
          </Button>
        </div>
      </div>

      {/* 사용자 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{userStats.total}</p>
                <p className="text-sm text-muted-foreground">전체 사용자</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <UserCheck className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{userStats.students}</p>
                <p className="text-sm text-muted-foreground">학생</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <UserCheck className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{userStats.professors}</p>
                <p className="text-sm text-muted-foreground">교수</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chart-4/10 rounded-lg">
                <UserCheck className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{userStats.active}</p>
                <p className="text-sm text-muted-foreground">활성 사용자 (최근 30일)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="이름, 이메일로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 사용자 목록 */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="student">학생</TabsTrigger>
          <TabsTrigger value="professor">교수</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          {loading ? (
            <div className="text-sm text-muted-foreground">불러오는 중…</div>
          ) : (
            <>
              <div className="grid gap-4">
                {rows.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.avatarUrl ?? undefined} />
                          <AvatarFallback>{(user.name || "?").slice(0, 1)}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-medium">{user.name}</h3>
                                {getRoleBadge(user.role)}
                                {getStatusBadge(user.active)}
                              </div>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>

                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Settings className="h-4 w-4 mr-2" />
                                설정
                              </Button>
                              <Button size="sm" variant="outline">
                                <Mail className="h-4 w-4 mr-2" />
                                메시지
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>가입: {format(user.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-muted-foreground" />
                              <span>최근 접속: {format(user.lastLoginAt)}</span>
                            </div>

                            {user.role === "STUDENT" && (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {user.currentProjectTitle ?? "프로젝트 없음"}
                                </Badge>
                              </div>
                            )}

                            {user.role === "PROFESSOR" && (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  담당 프로젝트: {user.taughtProjectCount ?? 0}개
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {!rows.length && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">검색 조건에 맞는 사용자가 없습니다.</p>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
