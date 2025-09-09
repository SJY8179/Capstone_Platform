import React, { useState, useEffect } from "react";
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
  const [currentUser] = useState({
    id: "1",
    name: "김학생",
    email: "kim@university.ac.kr",
    role: "student" as UserRole,
    avatar: null,
  });

  const [activePage, setActivePage] = useState<ActivePage>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

<<<<<<< HEAD
  // 데모/샘플용: 현재 보고 있는 프로젝트 id를 고정(백엔드에 존재하는 id여야 함)
  const projectId = 1;

=======
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
  useEffect(() => {
    http.get("/ping").catch((e) => {
      console.warn("Backend not reachable:", e);
      alert("백엔드 서버에 연결되지 않았습니다. 잠시 후 다시 시도해주세요.");
    });
  }, []);

  const renderMainContent = () => {
<<<<<<< HEAD
=======
    // 데모용으로 projectId는 1을 사용합니다.
    const projectId = 1;

>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
    switch (activePage) {
      case "dashboard":
        if (currentUser.role === "student")
          return <StudentDashboard projectId={projectId} />;
        if (currentUser.role === "professor")
          return <ProfessorDashboard projectId={projectId} />;
        if (currentUser.role === "admin")
          return <AdminDashboard projectId={projectId} />;
        return null;

      case "projects":
        return <ProjectManagement userRole={currentUser.role} />;

      case "teams":
        return <TeamManagement userRole={currentUser.role} />;

      case "evaluation":
        return (
          <EvaluationSystem userRole={currentUser.role} projectId={projectId} />
        );

      case "users":
        return currentUser.role === "admin" ? (
          <UserManagement />
        ) : (
          <div>권한이 없습니다.</div>
        );

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
<<<<<<< HEAD
        projectId={projectId}  // ✅ 사이드바에도 현재 프로젝트 id 전달
=======
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={currentUser} />
        <main className="flex-1 overflow-auto p-6">{renderMainContent()}</main>
      </div>
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
