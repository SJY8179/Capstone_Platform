import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserDto } from "@/types/domain";
import type { TeamListDto } from "@/types/domain";

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: TeamListDto | null;
    users: UserDto[];
    isLoading: boolean;
}

export function InviteMemberModal({ isOpen, onClose, team, users, isLoading }: InviteMemberModalProps) {
    if (!team) return null;

    const handleInvite = (userId: number) => {
        console.log(`Inviting user ${userId} to team ${team.id}`);
        alert(`${users.find(u => u.id === userId)?.name} 님을 초대했습니다! (추가 구현 필요)`);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>"{team.name}" 팀에 초대하기</DialogTitle>
                    <DialogDescription>초대할 팀원의 이름을 검색하고 초대 버튼을 누르세요.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {isLoading ? (<div>사용자 목록을 불러오는 중...</div>) : (
                        <ScrollArea className="h-72">
                            <div className="space-y-2">
                                {users.length > 0 ? (
                                    users.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-2 border rounded-md">
                                            <div>
                                                <p className="font-semibold">{user.name}</p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                            <Button size="sm" onClick={() => handleInvite(user.id)}>초대</Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-muted-foreground py-10">초대할 수 있는 사용자가 없습니다.</div>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}