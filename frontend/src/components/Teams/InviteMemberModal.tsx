import { useState, useMemo, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TeamListDto, UserDto } from "@/types/domain";
import { toast } from "sonner";
import { createInvitation } from "@/api/invitations";
import { getApiError } from "@/api/http";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamListDto | null;
  users: UserDto[];
  isLoading: boolean;
  onInviteSuccess: (teamId: number, newUser: UserDto) => void;
}

export function InviteMemberModal({ isOpen, onClose, team, users, isLoading, onInviteSuccess }: InviteMemberModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [invitingUserId, setInvitingUserId] = useState<number | null>(null);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, searchQuery]);

  useEffect(() => { if (isOpen) setSearchQuery(""); }, [isOpen]);

  if (!team) return null;

  const handleInvite = async (userToInvite: UserDto) => {
    if (!team || invitingUserId) return;
    setInvitingUserId(userToInvite.id);
    try {
      await createInvitation(team.id, userToInvite.id);
      onInviteSuccess(team.id, userToInvite);
      toast.success("초대 요청을 보냈습니다.");
    } catch (e: any) {
      const { message } = getApiError(e);
      toast.error(message || "오류 발생: 초대 요청을 보낼 수 없습니다.");
    } finally {
      setInvitingUserId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex flex-col max-h-[85vh] h-[600px]">
        <DialogHeader>
          <DialogTitle>"{team.name}" 팀에 초대하기</DialogTitle>
          <DialogDescription>초대할 팀원의 이름 또는 이메일을 검색하세요.</DialogDescription>
        </DialogHeader>

        <div className="relative py-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름 또는 이메일로 검색..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="사용자 검색"
          />
        </div>

        <div className="flex-1 relative min-h-0 py-4">
          {isLoading ? (
            <div>사용자 목록을 불러오는 중...</div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2 pr-4">
                {filteredUsers.length ? filteredUsers.map((user) => {
                  const isInviting = invitingUserId === user.id;
                  return (
                    <div key={user.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Button size="sm" onClick={() => handleInvite(user)} disabled={isInviting || invitingUserId !== null}>
                        {isInviting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />요청 발송…</>) : ("요청 발송")}
                      </Button>
                    </div>
                  );
                }) : (
                  <div className="text-center text-muted-foreground py-10">검색 결과가 없습니다.</div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
