import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Crown } from 'lucide-react';
import { updateTeam, changeLeader, removeMember, deleteTeam } from '@/api/teams';
import type { TeamListDto } from '@/types/domain';
import { SidebarNav } from '@/components/Teams/SidebarNav';

interface TeamSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: TeamListDto | null;
    onTeamUpdate: (updatedTeam: TeamListDto) => void;
    onTeamDelete: (teamId: number) => void;
    onRefreshNeeded: () => void;
}

export function TeamSettingsModal({
    isOpen,
    onClose,
    team,
    onTeamUpdate,
    onTeamDelete,
    onRefreshNeeded,
}: TeamSettingsModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedLeaderId, setSelectedLeaderId] = useState<string>('');
    const [confirmDeleteText, setConfirmDeleteText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [activeView, setActiveView] = useState('info');

    useEffect(() => {
        if (team) {
            setName(team.name);
            setDescription(team.description || '');
            const leader = team.members.find(m => m.role === 'leader');
            if (leader) {
                setSelectedLeaderId(String(leader.id));
            }
            setConfirmDeleteText('');
            setActiveView('info');
        }
    }, [team, isOpen]);

    if (!team) return null;

    const handleUpdateTeamInfo = async () => {
        setIsSubmitting(true);
        try {
            const updatedTeam = await updateTeam(team.id, name, description);
            onTeamUpdate(updatedTeam);
            alert('팀 정보가 수정되었습니다.');
        } catch (error) {
            alert(`팀 정보 수정에 실패했습니다: ${error instanceof Error ? error.message : ''}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLeaderChange = async (newLeaderId: string) => {
        const currentLeader = team.members.find(m => m.role === 'leader');
        if (String(currentLeader?.id) === newLeaderId) return;

        const newLeader = team.members.find(m => String(m.id) === newLeaderId);
        if (!newLeader || !window.confirm(`정말 ${newLeader.name}님을 새로운 팀장으로 임명하시겠습니까?`)) return;

        setIsSubmitting(true);
        try {
            await changeLeader(team.id, Number(newLeaderId));
            alert('팀장이 변경되었습니다.');
            onRefreshNeeded();
            onClose();
        } catch (error) {
            alert(`팀장 변경에 실패했습니다: ${error instanceof Error ? error.message : ''}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveMember = async (memberId: number, memberName: string) => {
        if (!window.confirm(`정말 ${memberName}님을 팀에서 삭제하시겠습니까?`)) return;

        setIsSubmitting(true);
        try {
            await removeMember(team.id, memberId);
            alert('팀원이 삭제되었습니다.');
            onRefreshNeeded();
            onClose();
        } catch (error) {
            alert(`팀원 삭제에 실패했습니다: ${error instanceof Error ? error.message : ''}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTeam = async () => {
        setIsSubmitting(true);
        try {
            await deleteTeam(team.id);
            onTeamDelete(team.id);
            alert('팀이 삭제되었습니다.');
            onClose();
        } catch (error) {
            alert('팀 삭제에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl h-[70vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle>팀 설정: {team.name}</DialogTitle>
                    <DialogDescription>
                        원하는 설정 탭을 선택하세요.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    <aside className="w-[200px] border-r p-4 bg-muted/40">
                        <SidebarNav activeView={activeView} setActiveView={setActiveView} />
                    </aside>

                    <main className="flex-1 overflow-y-auto p-6">
                        {/* 1. 정보 수정 탭 */}
                        {activeView === 'info' && (
                            <Card className="border-none shadow-none">
                                <CardContent className="pt-6 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="team-name">팀 이름</Label>
                                        <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="team-description">팀 소개</Label>
                                        <Textarea id="team-description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSubmitting} />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button onClick={handleUpdateTeamInfo} disabled={isSubmitting}>
                                        {isSubmitting ? "저장 중..." : "팀 정보 저장"}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {/* 2. 팀원 관리 탭 */}
                        {activeView === 'members' && (
                            <Card className="border-none shadow-none">
                                <CardContent className="pt-6 space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="leader-select" className="flex items-center gap-1"><Crown className="w-4 h-4 text-yellow-500" /> 팀 리더</Label>
                                        <Select value={selectedLeaderId} onValueChange={handleLeaderChange} disabled={isSubmitting}>
                                            <SelectTrigger id="leader-select"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {team.members.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>팀원 목록</Label>
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                                            {team.members.filter(m => m.role !== 'leader').map(member => (
                                                <div key={member.id} className="flex items-center justify-between p-2">
                                                    <span>{member.name}</span>
                                                    <Button size="sm" variant="destructive" onClick={() => handleRemoveMember(member.id, member.name)} disabled={isSubmitting}>삭제</Button>
                                                </div>
                                            ))}
                                            {team.members.length === 1 && <p className="text-sm text-muted-foreground p-2">팀원이 없습니다.</p>}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        
                        {/* 3. 팀 삭제 탭 */}
                        {activeView === 'danger' && (
                            <Card className="border-none shadow-none">
                                <CardHeader>
                                    <h3 className="font-semibold text-lg text-destructive">위험 구역</h3>
                                    <p className="text-sm text-muted-foreground">팀을 삭제하면 되돌릴 수 없습니다. 삭제하려면 팀 이름을 정확히 입력해주세요.</p>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm-delete">팀 이름({team.name})</Label>
                                        <Input
                                            id="confirm-delete"
                                            value={confirmDeleteText}
                                            onChange={(e) => setConfirmDeleteText(e.target.value)}
                                            placeholder="삭제하려면 팀 이름을 똑같이 입력하세요."
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDeleteTeam}
                                        disabled={confirmDeleteText !== team.name || isSubmitting}
                                        className="w-full"
                                    >
                                        {isSubmitting ? "삭제 중..." : "이 팀을 영구적으로 삭제합니다"}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}
                    </main>
                </div>
            </DialogContent>
        </Dialog>
    );
}