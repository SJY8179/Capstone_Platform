import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProjectManagement } from "./ProjectManagement";
import { listProjects } from "@/api/projects";

// Mock dependencies
jest.mock("@/api/projects", () => ({
  listProjects: jest.fn(),
  createProject: jest.fn(),
}));

jest.mock("@/stores/auth", () => ({
  useAuth: () => ({
    user: { role: "student" }
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockListProjects = listProjects as jest.MockedFunction<typeof listProjects>;

describe("ProjectManagement - Button Always Works", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListProjects.mockResolvedValue([]);
  });

  it("should open modal when 'New Project' button is clicked", async () => {
    render(<ProjectManagement userRole="student" />);
    
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    const newProjectButton = screen.getByRole("button", { name: /새 프로젝트/ });
    expect(newProjectButton).toBeInTheDocument();
    expect(newProjectButton).not.toBeDisabled();

    fireEvent.click(newProjectButton);

    // Modal should open
    expect(screen.getByText("새 프로젝트")).toBeInTheDocument();
    expect(screen.getByLabelText("프로젝트명 *")).toBeInTheDocument();
  });

  it("should keep button functional after modal close", async () => {
    render(<ProjectManagement userRole="student" />);
    
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    const newProjectButton = screen.getByRole("button", { name: /새 프로젝트/ });

    // First click - open modal
    fireEvent.click(newProjectButton);
    expect(screen.getByText("새 프로젝트")).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    await waitFor(() => {
      expect(screen.queryByText("새 프로젝트")).not.toBeInTheDocument();
    });

    // Second click - button should still work
    expect(newProjectButton).not.toBeDisabled();
    fireEvent.click(newProjectButton);
    expect(screen.getByText("새 프로젝트")).toBeInTheDocument();
  });

  it("should show empty state with action button when no projects", async () => {
    render(<ProjectManagement userRole="student" />);
    
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    // Should show empty state
    expect(screen.getByText("아직 프로젝트가 없습니다.")).toBeInTheDocument();
    
    // Empty state should also have a create button
    const emptyStateButton = screen.getByRole("button", { name: /새 프로젝트를 만들어 보세요/ });
    expect(emptyStateButton).toBeInTheDocument();
    
    fireEvent.click(emptyStateButton);
    expect(screen.getByText("새 프로젝트")).toBeInTheDocument();
  });

  it("should not show new project button for non-student users", async () => {
    render(<ProjectManagement userRole="professor" />);
    
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /새 프로젝트/ })).not.toBeInTheDocument();
  });

  it("should handle repeated button clicks without issues", async () => {
    render(<ProjectManagement userRole="student" />);
    
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    const newProjectButton = screen.getByRole("button", { name: /새 프로젝트/ });

    // Multiple rapid clicks should work
    for (let i = 0; i < 3; i++) {
      fireEvent.click(newProjectButton);
      expect(screen.getByText("새 프로젝트")).toBeInTheDocument();
      
      fireEvent.click(screen.getByRole("button", { name: "취소" }));
      
      await waitFor(() => {
        expect(screen.queryByLabelText("프로젝트명 *")).not.toBeInTheDocument();
      });
      
      expect(newProjectButton).not.toBeDisabled();
      expect(newProjectButton).toBeEnabled();
    }
  });
});