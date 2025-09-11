import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { addTeamMember } from "@/api/teams";
import type { TeamListDto, UserDto } from "@/types/domain";

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

    const filteredUsers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return users;
        }
        return users.filter(user =>
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query)
        );
    }, [users, searchQuery]);

    if (!team) return null;

    const handleInvite = async (userToInvite: UserDto) => {
        if (!team) return;

        try {
            await addTeamMember(team.id, userToInvite.id);

            onInviteSuccess(team.id, userToInvite);

            alert(`${userToInvite.name} 님을 팀에 초대했습니다.`);
            onClose();
        } catch (error) {
            console.error("[팀원 추가 오류]Team member add error:", error);
            alert("오류 발생: 팀원을 추가할 수 없습니다.");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>"{team.name}" 팀에 초대하기</DialogTitle>
                    <DialogDescription>
                        초대할 팀원의 이름 또는 이메일을 검색하세요.
                    </DialogDescription>
                </DialogHeader>
                <div className="relative py-2">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <Input
                        placeholder="이름 또는 이메일로 검색..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="사용자 검색"
                    />
                </div>
                <div className="py-4">
                    {isLoading ? (<div>사용자 목록을 불러오는 중...</div>) : (
                        <ScrollArea className="h-72">
                            <div className="space-y-2">
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-2 border rounded-md">
                                            <div>
                                                <p className="font-semibold">{user.name}</p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                            <Button size="sm" onClick={() => handleInvite(user)}>초대</Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-muted-foreground py-10">
                                        검색 결과가 없습니다.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}