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
import ProjectAssignments from "@/pages/Projects/Assignments";
import { NotificationCenter } from "@/components/Notifications/NotificationCenter";
import { SettingsPage } from "@/components/Settings/SettingsPage";
import { http } from "@/api/http";
import { Toaster } from "@/components/ui/sonner";
import type { User } from "@/types/user";

/** 앱 설정(로컬스토리지 연동) */
export interface AppSettings {
  fontSize: "small" | "medium" | "large";
  sidebarBehavior: "auto" | "always-expanded" | "always-collapsed";
  isDarkMode: boolean;
}

export type ActivePage =
  | "dashboard"
  | "projects"
  | "teams"
  | "evaluation"
  | "users"
  | "schedule"
  | "assignments"
  | "notifications"
  | "settings";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<ActivePage>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 선택된 프로젝트
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [loadingProjectId, setLoadingProjectId] = useState(false);

  // 앱 설정 (LS 초기 로드)
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("app-settings");
      return saved
        ? JSON.parse(saved)
        : {
            fontSize: "medium",
            sidebarBehavior: "auto",
            isDarkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
          };
    } catch {
      return { fontSize: "medium", sidebarBehavior: "auto", isDarkMode: false };
    }
  });

  // 설정 변화 반영: 저장 + 폰트/다크모드 적용
  useEffect(() => {
    localStorage.setItem("app-settings", JSON.stringify(appSettings));

    const fontSizeMap: Record<AppSettings["fontSize"], string> = {
      small: "14px",
      medium: "16px",
      large: "18px",
    };
    document.documentElement.style.setProperty("--font-size", fontSizeMap[appSettings.fontSize]);
    document.documentElement.classList.toggle("dark", appSettings.isDarkMode);
  }, [appSettings]);

  // 사이드바 행동 모드 반영
  useEffect(() => {
    if (appSettings.sidebarBehavior === "always-expanded") setSidebarCollapsed(false);
    else if (appSettings.sidebarBehavior === "always-collapsed") setSidebarCollapsed(true);
  }, [appSettings.sidebarBehavior]);

  // 백엔드 헬스 체크
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

  /** 앱 설정 업데이트 */
  const updateAppSettings = (partial: Partial<AppSettings>) =>
    setAppSettings((prev) => ({ ...prev, ...partial }));

  /** 사이드바 토글 (auto 일 때만 수동 토글 허용) */
  const handleSidebarToggle = () => {
    if (appSettings.sidebarBehavior === "auto") setSidebarCollapsed((v) => !v);
  };

  // 로그인 후 “내 프로젝트” 자동 선택
  useEffect(() => {
    if (!currentUser) return;

    const pickMyProject = async () => {
      setLoadingProjectId(true);
      try {
        let list: any[] = [];
        let myApiSucceeded = false;

        // 1) /projects/my 우선
        try {
          const r = await http.get("/projects/my");
          myApiSucceeded = true;
          list = Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.content ?? [];
        } catch (err: any) {
          if (err?.response?.status !== 404) throw err;
        }

        // 2) fallback: /projects 전체 → 멤버십 우선 선택
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

  // 비로그인 상태
  if (!currentUser) {
    return (
      <>
        <LoginForm onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  const NotAllowed = (
    <div className="p-6">
      <div className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold">권한이 없습니다</h2>
        <p className="text-sm text-muted-foreground mt-1">
          이 기능은 교수 또는 관리자만 사용할 수 있습니다.
        </p>
      </div>
    </div>
  );

  const renderMainContent = () => {
    const needProject = activePage === "evaluation" || activePage === "assignments";

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
        if (currentUser.role === "student") return NotAllowed;
        return <EvaluationSystem userRole={currentUser.role} projectId={activeProjectId!} />;

      case "users":
        return currentUser.role === "admin" ? <UserManagement /> : <div>권한이 없습니다.</div>;

      case "schedule":
        return (
          <ScheduleManagement
            userRole={currentUser.role}
            projectId={activeProjectId ?? undefined}
          />
        );

      case "assignments":
        return <ProjectAssignments projectId={activeProjectId!} />;

      case "notifications": // ✅ 공지/메시지
        return <NotificationCenter userRole={currentUser.role} />;

      case "settings": // ✅ 설정
        return (
          <SettingsPage
            userRole={currentUser.role}
            currentUser={currentUser}
            appSettings={appSettings}
            onSettingsChange={updateAppSettings}
          />
        );

      default:
        return <div>페이지를 찾을 수 없습니다.</div>;
    }
  };

  const isSidebarToggleDisabled = appSettings.sidebarBehavior !== "auto";

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        userRole={currentUser.role}
        activePage={activePage}
        onPageChange={setActivePage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleSidebarToggle}
        toggleDisabled={isSidebarToggleDisabled}
        projectId={activeProjectId ?? undefined}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={currentUser}
          onLogout={handleLogout}
          activeProjectId={activeProjectId}
          onChangeActiveProject={(id) => setActiveProjectId(id)}
          onNotificationClick={() => setActivePage("notifications")} // 헤더 드롭다운 → 알림 센터로 이동
          /** ✅ 헤더 드롭다운 '설정' 클릭 시 Settings 탭으로 이동 */
          onOpenSettings={() => setActivePage("settings")}
        />
        <main className="flex-1 overflow-auto p-6">{renderMainContent()}</main>
      </div>
      <Toaster />
    </div>
  );
}