import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { createProject } from "@/api/projects";
import { listTeams } from "@/api/teams";
import type { CreateProjectRequest, ProjectListDto, TeamListDto } from "@/types/domain";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newProject: ProjectListDto) => void;
}

interface FormData {
  title: string;
  description?: string;
  teamOption: "existing" | "new"; // 기존 팀 선택 vs 새 팀 생성
  teamId?: string; // 기존 팀 ID (문자열로 받아서 나중에 숫자로 변환)
  teamName?: string;
  teamDescription?: string;
}

export function CreateProjectModal({ open, onOpenChange, onSuccess }: CreateProjectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teams, setTeams] = useState<TeamListDto[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      teamOption: "existing",
    },
  });

  const teamOption = watch("teamOption");

  // 팀 목록 로드
  useEffect(() => {
    if (open) {
      loadTeams();
    }
  }, [open]);

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

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      const request: CreateProjectRequest = {
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
      };

      // 기존 팀 선택 vs 새 팀 생성
      if (data.teamOption === "existing") {
        if (!data.teamId) {
          toast.error("팀을 선택해주세요.");
          return;
        }
        request.teamId = parseInt(data.teamId, 10);
      } else {
        if (!data.teamName?.trim()) {
          toast.error("팀 이름을 입력해주세요.");
          return;
        }
        request.teamName = data.teamName.trim();
        request.teamDescription = data.teamDescription?.trim() || undefined;
      }

      const newProject = await createProject(request);

      toast.success("프로젝트가 생성됐어요.");
      onSuccess?.(newProject);
      onOpenChange(false);
      reset();
    } catch (error: any) {
      console.error("프로젝트 생성 실패:", error);
      toast.error("생성에 실패했어요. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 프로젝트 생성</DialogTitle>
          <DialogDescription>
            새로운 프로젝트와 팀을 생성합니다.
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

          <div className="space-y-4">
            <Label>팀 설정</Label>
            <Controller
              name="teamOption"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="existing" id="existing" />
                    <Label htmlFor="existing">기존 팀 선택</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="new" id="new" />
                    <Label htmlFor="new">새 팀 생성</Label>
                  </div>
                </RadioGroup>
              )}
            />
          </div>

          {teamOption === "existing" && (
            <div className="space-y-2">
              <Label htmlFor="teamId">팀 선택 *</Label>
              <Controller
                name="teamId"
                control={control}
                rules={{ required: teamOption === "existing" ? "팀을 선택해주세요" : false }}
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
          )}

          {teamOption === "new" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="teamName">팀 이름 *</Label>
                <Input
                  id="teamName"
                  {...register("teamName", {
                    required: teamOption === "new" ? "팀 이름은 필수입니다" : false,
                    minLength: { value: 2, message: "2자 이상 입력해주세요" },
                    maxLength: { value: 80, message: "80자를 초과할 수 없습니다" },
                  })}
                  placeholder="팀 이름을 입력하세요"
                  disabled={isSubmitting}
                />
                {errors.teamName && (
                  <p className="text-sm text-destructive">{errors.teamName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamDescription">팀 설명</Label>
                <Textarea
                  id="teamDescription"
                  {...register("teamDescription", {
                    maxLength: { value: 200, message: "200자를 초과할 수 없습니다" },
                  })}
                  placeholder="팀에 대한 간단한 설명 (선택)"
                  rows={2}
                  disabled={isSubmitting}
                />
                {errors.teamDescription && (
                  <p className="text-sm text-destructive">{errors.teamDescription.message}</p>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "생성 중..." : "생성하기"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateProjectModal;