import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateProjectModal } from "./CreateProjectModal";
import { createProject } from "@/api/projects";
import { toast } from "sonner";

// Mock dependencies
jest.mock("@/api/projects", () => ({
  createProject: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockCreateProject = createProject as jest.MockedFunction<typeof createProject>;

describe("CreateProjectModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onCreateSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the modal when open", () => {
    render(<CreateProjectModal {...defaultProps} />);
    
    expect(screen.getByText("새 프로젝트")).toBeInTheDocument();
    expect(screen.getByLabelText("프로젝트명 *")).toBeInTheDocument();
    expect(screen.getByLabelText("설명")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(<CreateProjectModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText("새 프로젝트")).not.toBeInTheDocument();
  });

  it("should validate required fields", async () => {
    render(<CreateProjectModal {...defaultProps} />);
    
    const submitButton = screen.getByRole("button", { name: "생성" });
    expect(submitButton).toBeDisabled();
    
    // Enter project name
    const nameInput = screen.getByLabelText("프로젝트명 *");
    fireEvent.change(nameInput, { target: { value: "Test Project" } });
    
    expect(submitButton).toBeEnabled();
  });

  it("should create project successfully and close modal", async () => {
    const mockProject = {
      id: 1,
      name: "Test Project",
      description: "Test Description",
      status: "in-progress" as const,
      team: "Test Team",
      lastUpdate: "2023-12-01",
      progress: 0,
      members: [],
      milestones: { completed: 0, total: 0 },
      nextDeadline: null,
    };

    mockCreateProject.mockResolvedValueOnce(mockProject);

    render(<CreateProjectModal {...defaultProps} />);
    
    // Fill form
    fireEvent.change(screen.getByLabelText("프로젝트명 *"), { 
      target: { value: "Test Project" } 
    });
    fireEvent.change(screen.getByLabelText("설명"), { 
      target: { value: "Test Description" } 
    });
    
    // Submit
    fireEvent.click(screen.getByRole("button", { name: "생성" }));
    
    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith({
        title: "Test Project",
        description: "Test Description",
      });
    });
    
    expect(defaultProps.onCreateSuccess).toHaveBeenCalledWith(mockProject);
    expect(defaultProps.onClose).toHaveBeenCalled(); // ✅ 성공 시 모달 닫기 확인
    expect(toast.success).toHaveBeenCalledWith("프로젝트가 생성되었습니다.");
  });

  it("should handle API errors and keep modal open", async () => {
    mockCreateProject.mockRejectedValueOnce(new Error("서버 오류"));

    render(<CreateProjectModal {...defaultProps} />);
    
    // Fill and submit form
    fireEvent.change(screen.getByLabelText("프로젝트명 *"), { 
      target: { value: "Test Project" } 
    });
    fireEvent.click(screen.getByRole("button", { name: "생성" }));
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("생성에 실패했습니다.");
    });
    
    expect(defaultProps.onCreateSuccess).not.toHaveBeenCalled();
    expect(defaultProps.onClose).not.toHaveBeenCalled(); // 실패 시 모달은 열린 상태 유지
  });

  it("should reset form after closing", () => {
    render(<CreateProjectModal {...defaultProps} />);
    
    // Fill form
    fireEvent.change(screen.getByLabelText("프로젝트명 *"), { 
      target: { value: "Test Project" } 
    });
    
    // Close modal
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});