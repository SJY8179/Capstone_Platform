import { useState, useEffect } from "react";
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

// --- 업데이트된 부분 시작 ---
import { LoginForm } from "@/components/Auth/LoginForm"; // 1. LoginForm 컴포넌트 import
import { Toaster } from "@/components/ui/sonner"; // 2. Toaster 컴포넌트 import

// User 인터페이스 정의
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string | null;
}
// --- 업데이트된 부분 끝 ---

export type UserRole = "student" | "professor" | "admin";
export type ActivePage =
  | "dashboard"
  | "projects"
  | "teams"
  | "evaluation"
  | "users"
  | "schedule"
  | "settings";

export default function App() {
  // --- 업데이트된 부분 시작 ---
  // 3. currentUser 상태를 null로 시작하도록 변경
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // --- 업데이트된 부분 끝 ---

  const [activePage, setActivePage] = useState<ActivePage>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const projectId = 1;

  useEffect(() => {
    http.get("/ping").catch((e) => {
      console.warn("Backend not reachable:", e);
      alert("백엔드 서버에 연결되지 않았습니다. 잠시 후 다시 시도해주세요.");
    });
  }, []);

  // --- 업데이트된 부분 시작 ---
  // 4. 로그인/로그아웃 핸들러 함수 추가
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActivePage("dashboard"); // 로그인 후 대시보드로 이동
  };

  const handleLogout = () => {
    setCurrentUser(null);
    // 필요하다면 여기에 로그아웃 API 호출 추가
  };
  // --- 업데이트된 부분 끝 ---

  // 5. 로그인 상태가 아닐 경우 LoginForm 렌더링
  if (!currentUser) {
    return (
      <>
        <LoginForm onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  const renderMainContent = () => {
    switch (activePage) {
      case "dashboard":
        if (currentUser.role === "student") return <StudentDashboard projectId={projectId} />;
        if (currentUser.role === "professor") return <ProfessorDashboard projectId={projectId} />;
        if (currentUser.role === "admin") return <AdminDashboard projectId={projectId} />;
        return null;

      case "projects":
        return <ProjectManagement userRole={currentUser.role} />;

      case "teams":
        return <TeamManagement userRole={currentUser.role} />;

      case "evaluation":
        return <EvaluationSystem userRole={currentUser.role} projectId={projectId} />;

      case "users":
        return currentUser.role === "admin" ? <UserManagement /> : <div>권한이 없습니다.</div>;

      case "schedule":
        return <ScheduleManagement userRole={currentUser.role} />;

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
        projectId={projectId}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* --- 업데이트된 부분 시작 --- */}
        {/* 6. Header에 user 객체와 onLogout 핸들러 전달 */}
        <Header user={currentUser} onLogout={handleLogout} />
        {/* --- 업데이트된 부분 끝 --- */}
        <main className="flex-1 overflow-auto p-6">{renderMainContent()}</main>
      </div>
      {/* 7. 메인 앱 레이아웃에도 Toaster 추가 */}
      <Toaster />
    </div>
  );
}