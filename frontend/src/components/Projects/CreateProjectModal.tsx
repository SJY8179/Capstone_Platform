import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createProject } from "@/api/projects";
import { listTeams, listTeamProfessors, getAllProfessors } from "@/api/teams";
import {
  createProfessorPreRequest,
  createProfessorRequestForProject,
} from "@/api/professorRequests";
import type {
  CreateProjectRequest,
  ProjectListDto,
  TeamListDto,
} from "@/types/domain";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newProject: ProjectListDto) => void;
}

interface FormData {
  title: string;
  description?: string;
  teamId: string; // 팀 ID (필수)
  professorId?: string; // 담당 교수 ID (선택)
}

export function CreateProjectModal({ open, onOpenChange, onSuccess }: CreateProjectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teams, setTeams] = useState<TeamListDto[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [professors, setProfessors] = useState<Array<{ id: number; name: string; email: string }>>(
    []
  );
  const [loadingProfessors, setLoadingProfessors] = useState(false);

  // 생성 후 “담당 교수 요청” 다이얼로그 (사전/사후 모두 지원)
  const [reqOpen, setReqOpen] = useState(false);
  const [reqProjectId, setReqProjectId] = useState<number | null>(null); // 사후요청
  const [reqTeamId, setReqTeamId] = useState<number | null>(null);       // 사전요청
  const [reqTitle, setReqTitle] = useState<string>("");                  // 사전요청
  const [reqProfs, setReqProfs] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [reqProfessorId, setReqProfessorId] = useState<string | undefined>(undefined);
  const [reqMessage, setReqMessage] = useState("");
  const [reqLoading, setReqLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormData>();

  const selectedTeamId = watch("teamId");

  // 모달 오픈 시 팀 목록/폼 리셋
  useEffect(() => {
    if (open) {
      loadTeams();
      reset({
        title: "",
        description: "",
        teamId: "",
        professorId: undefined,
      });
      setProfessors([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 팀 변경 시 해당 팀의 교수 멤버 로드
  useEffect(() => {
    const fetchProfs = async () => {
      if (!selectedTeamId) {
        setProfessors([]);
        return;
      }
      try {
        setLoadingProfessors(true);
        const list = await listTeamProfessors(parseInt(selectedTeamId, 10));
        setProfessors(list ?? []);
      } catch (e) {
        console.error("팀 교수 목록 로드 실패:", e);
        setProfessors([]);
      } finally {
        setLoadingProfessors(false);
      }
    };
    fetchProfs();
  }, [selectedTeamId]);

  const loadTeams = async () => {
    try {
      setLoadingTeams(true);
      const teamList = await listTeams();
      setTeams(teamList);
    } catch (error) {
      console.error("팀 목록 로드 실패:", error);
      toast.error("팀 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoadingTeams(false);
    }
  };

  /** 프로젝트 생성 핸들러 */
  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      const title = data.title.trim();
      const teamIdNum = parseInt(data.teamId, 10);
      const selectedProfId =
        data.professorId && data.professorId !== "none" ? parseInt(data.professorId, 10) : undefined;

      // ⛳ 분기 1) 담당 교수를 지정한 경우 → 프로젝트 즉시 생성
      if (selectedProfId) {
        const req: CreateProjectRequest = {
          title,
          description: data.description?.trim() || undefined,
          teamId: teamIdNum,
          professorId: selectedProfId,
        };
        const newProject = await createProject(req);
        toast.success("프로젝트가 생성됐어요.");
        onSuccess?.(newProject);
        onOpenChange(false);
        reset({ title: "", description: "", teamId: "", professorId: undefined });
        return;
      }

      // ⛳ 분기 2) 담당 교수를 지정하지 않은 경우 → 사전요청 다이얼로그 오픈
      setReqProjectId(null);
      setReqTeamId(teamIdNum);
      setReqTitle(title);
      await openProfessorRequestDialog(teamIdNum);
      onOpenChange(false); // 생성 모달 닫고 요청 모달로 전환
      reset({ title: "", description: "", teamId: "", professorId: undefined });
    } catch (error: any) {
      console.error("프로젝트 생성/요청 준비 실패:", error);
      const serverMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "실패했어요. 다시 시도해주세요.";
      toast.error(serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      reset({
        title: "",
        description: "",
        teamId: "",
        professorId: undefined,
      });
    }
  };

  /** 요청 다이얼로그 준비: 팀 교수(우선) → 전체 교수(대체) */
  const openProfessorRequestDialog = async (teamIdNum: number) => {
    try {
      setReqOpen(true);
      setReqProfessorId(undefined);
      setReqMessage("");
      setReqProfs([]);
      let list = await listTeamProfessors(teamIdNum);
      if (!list || list.length === 0) {
        list = await getAllProfessors();
      }
      setReqProfs(list ?? []);
    } catch (e) {
      console.error(e);
      toast.error("교수 목록을 불러오지 못했습니다.");
      setReqProfs([]);
    }
  };

  /** 요청 전송 */
  const submitProfessorRequest = async () => {
    if (!reqProfessorId || reqProfessorId === "none") {
      toast.error("담당 교수님을 선택해 주세요.");
      return;
    }
    try {
      setReqLoading(true);
      const profId = parseInt(reqProfessorId, 10);

      if (reqProjectId) {
        // 사후요청: 기존 프로젝트에 대한 요청
        await createProfessorRequestForProject(
          reqProjectId,
          profId,
          reqMessage.trim() || undefined
        );
      } else {
        // 사전요청: 프로젝트 없이 팀/제목으로 요청
        if (!reqTeamId || !reqTitle.trim()) {
          toast.error("요청에 필요한 정보가 부족합니다. 다시 시도해 주세요.");
          return;
        }
        await createProfessorPreRequest(
          reqTeamId,
          reqTitle.trim(),
          profId,                       // ✅ 백엔드가 기대하는 필드명: professorId
          reqMessage.trim() || undefined
        );
      }

      toast.success("담당 교수님에게 요청을 보냈어요.");
      setReqOpen(false);
      setReqProfessorId(undefined);
      setReqMessage("");
      setReqTeamId(null);
      setReqTitle("");
      setReqProjectId(null);
    } catch (e: any) {
      console.error(e);
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "요청 전송에 실패했습니다.";
      toast.error(msg);
    } finally {
      setReqLoading(false);
    }
  };

  return (
    <>
      {/* 프로젝트 생성 다이얼로그 */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>새 프로젝트 생성</DialogTitle>
            <DialogDescription>
              팀을 선택하고 (선택사항) 담당 교수를 지정할 수 있어요.
              <br />
              <span className="text-xs text-muted-foreground">
                담당 교수를 지정하지 않으면 “배정 요청”을 먼저 보냅니다. 교수님 승인이 되면 프로젝트가 생성돼요.
              </span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">프로젝트 이름 *</Label>
              <Input
                id="title"
                {...register("title", {
                  required: "프로젝트 이름은 필수입니다",
                  minLength: { value: 2, message: "2자 이상 입력해주세요" },
                  maxLength: { value: 100, message: "100자를 초과할 수 없습니다" },
                })}
                placeholder="프로젝트 이름을 입력하세요"
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">프로젝트 설명</Label>
              <Textarea
                id="description"
                {...register("description", {
                  maxLength: { value: 500, message: "500자를 초과할 수 없습니다" },
                })}
                placeholder="프로젝트에 대한 간단한 설명 (선택)"
                rows={3}
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamId">팀 선택 *</Label>
              <Controller
                name="teamId"
                control={control}
                rules={{ required: "팀을 선택해주세요" }}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting || loadingTeams}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={loadingTeams ? "팀 목록 로딩 중..." : "팀을 선택하세요"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.teamId && (
                <p className="text-sm text-destructive">{errors.teamId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="professorId">담당 교수 (선택)</Label>
              <Controller
                name="professorId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting || loadingProfessors || !selectedTeamId}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !selectedTeamId
                            ? "먼저 팀을 선택하세요"
                            : loadingProfessors
                              ? "교수 목록 로딩 중..."
                              : "담당 교수를 선택하세요 (선택사항)"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 안함</SelectItem>
                      {professors.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name} ({p.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.professorId && (
                <p className="text-sm text-destructive">{errors.professorId.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "처리 중..." : "다음"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 생성 후: 담당 교수 요청 다이얼로그 (사전/사후 겸용) */}
      <Dialog open={reqOpen} onOpenChange={(o) => !reqLoading && setReqOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>담당 교수 지정 요청</DialogTitle>
            <DialogDescription>
              {reqProjectId
                ? "생성된 프로젝트의 담당 교수님께 배정을 요청합니다."
                : "프로젝트 생성 전에 담당 교수님께 배정을 요청합니다. 승인되면 프로젝트가 생성됩니다."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>교수 선택</Label>
              <Select
                value={reqProfessorId}
                onValueChange={setReqProfessorId}
                disabled={reqLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="담당 교수님을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {reqProfs.length === 0 && (
                    <SelectItem value="none" disabled>
                      교수 목록이 없습니다
                    </SelectItem>
                  )}
                  {reqProfs.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} ({p.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 사전요청이면 제목을 다시 확인/수정할 수 있게 보여줘도 좋지만,
                여기서는 생성폼에서 입력한 제목(reqTitle)을 그대로 사용한다. */}

            <div className="space-y-2">
              <Label htmlFor="req-msg">메세지 (선택)</Label>
              <Textarea
                id="req-msg"
                placeholder="예: 해당 주제에 대한 지도가 필요합니다."
                value={reqMessage}
                onChange={(e) => setReqMessage(e.target.value)}
                disabled={reqLoading}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReqOpen(false)} disabled={reqLoading}>
              나중에
            </Button>
            <Button onClick={submitProfessorRequest} disabled={reqLoading || !reqProfessorId}>
              {reqLoading ? "전송 중..." : "요청 보내기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CreateProjectModal;
