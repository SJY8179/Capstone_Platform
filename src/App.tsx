// 변경된 부분만 반영한 전체 교체본
import { useState, useEffect } from "react";
import { LoginForm } from "@/components/Auth/LoginForm";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { StudentDashboard } from "@/pages/Dashboard/StudentDashboard";
import { ProfessorDashboard } from "@/pages/Dashboard/ProfessorDashboard";
import { AdminDashboard } from "@/pages/Dashboard/AdminDashboard";
import { ProjectManagement } from "@/pages/Projects/ProjectManagement";
import { TeamManagement } from "@/pages/Teams/TeamManagement";
import { EvaluationSystem } from "@/pages/Evaluation/EvaluationSystem";
import { UserManagement } from "@/pages/Admin/UserManagement";
import { ScheduleManagement } from "@/pages/Schedule/ScheduleManagement";
import { http } from "@/api/http";
import { Toaster } from "@/components/ui/sonner";
import type { User } from "@/types/user";

export type ActivePage =
  | "dashboard"
  | "projects"
  | "teams"
  | "evaluation"
  | "users"
  | "schedule"
  | "settings";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<ActivePage>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 선택된 프로젝트
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [loadingProjectId, setLoadingProjectId] = useState(false);

  useEffect(() => {
    http.get("/actuator/health").catch(() => {
      console.warn("Backend not reachable");
      alert("백엔드 서버에 연결되지 않았습니다. 잠시 후 다시 시도해주세요.");
    });
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActivePage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setCurrentUser(null);
    setActiveProjectId(null);
  };

  // 로그인 후 “내 프로젝트” 자동 선택
  useEffect(() => {
    if (!currentUser) return;

    const pickMyProject = async () => {
      setLoadingProjectId(true);
      try {
        let list: any[] = [];
        let myApiSucceeded = false;

        // 1) /projects/my가 있으면 결과 그대로 사용 (비어있어도 fallback 금지)
        try {
          const r = await http.get("/projects/my");
          myApiSucceeded = true;
          list = Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.content ?? [];
        } catch (err: any) {
          if (err?.response?.status !== 404) throw err;
        }

        // 2) /projects/my가 없을 때만 전체 목록으로 보조 선택
        if (!myApiSucceeded) {
          const r = await http.get("/projects");
          const raw = Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.content ?? [];
          const byMembership =
            raw.filter(
              (p: any) =>
                p?.isMember === true ||
                p?.member === true ||
                p?.joined === true ||
                !!p?.myRole ||
                !!p?.roleInProject
            ) ?? [];
          list = byMembership.length ? byMembership : raw;
        }

        if (!list?.length) {
          setActiveProjectId(null);
          return;
        }

        const candidate =
          list.find(
            (p: any) =>
              p?.isMember === true ||
              p?.member === true ||
              p?.joined === true ||
              !!p?.myRole ||
              !!p?.roleInProject
          ) ?? list[0];

        setActiveProjectId(candidate?.id ?? null);
      } catch (e) {
        console.warn("Failed to pick my project", e);
        setActiveProjectId(null);
      } finally {
        setLoadingProjectId(false);
      }
    };

    pickMyProject();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <>
        <LoginForm onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  const renderMainContent = () => {
    // 평가만 프로젝트 필요 (일정은 프로젝트 없어도 진입 → 빈 목록 + 추가 가능)
    const needProject = activePage === "evaluation";

    if (needProject && !activeProjectId) {
      return (
        <div className="p-6 text-sm text-muted-foreground">
          {loadingProjectId
            ? "내 프로젝트를 불러오는 중..."
            : "참여 중인 프로젝트가 없습니다. 프로젝트를 생성하거나 초대받으세요."}
        </div>
      );
    }

    switch (activePage) {
      case "dashboard":
        if (currentUser.role === "student")
          return <StudentDashboard projectId={activeProjectId ?? undefined} />;
        if (currentUser.role === "professor")
          return <ProfessorDashboard projectId={activeProjectId ?? undefined} />;
        if (currentUser.role === "admin")
          return <AdminDashboard projectId={activeProjectId ?? undefined} />;
        return null;

      case "projects":
        return <ProjectManagement userRole={currentUser.role} />;

      case "teams":
        return <TeamManagement userRole={currentUser.role} />;

      case "evaluation":
        return (
          <EvaluationSystem
            userRole={currentUser.role}
            projectId={activeProjectId!}
          />
        );

      case "users":
        return currentUser.role === "admin" ? (
          <UserManagement />
        ) : (
          <div>권한이 없습니다.</div>
        );

      case "schedule":
        return (
          <ScheduleManagement
            userRole={currentUser.role}
            projectId={activeProjectId ?? undefined}
          />
        );

      default:
        return <div>페이지를 찾을 수 없습니다.</div>;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        userRole={currentUser.role}
        activePage={activePage}
        onPageChange={setActivePage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        projectId={activeProjectId ?? undefined}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={currentUser} onLogout={handleLogout} />
        <main className="flex-1 overflow-auto p-6">{renderMainContent()}</main>
      </div>
      <Toaster />
    </div>
  );
}