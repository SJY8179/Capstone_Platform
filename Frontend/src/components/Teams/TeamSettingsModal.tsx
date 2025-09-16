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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, UserPlus } from 'lucide-react';
import { toast } from "sonner";
import {
    updateTeam, changeLeader, removeMember, deleteTeam,
    getAllProfessors, addProfessorToTeam
} from '@/api/teams';
import type { TeamListDto } from '@/types/domain';
import { SidebarNav } from '@/components/Teams/SidebarNav';

interface TeamSettingsHandlers {
    onTeamUpdate: (updatedTeam: TeamListDto) => void;
    onTeamDelete: (teamId: number) => void;
    onRefreshNeeded: () => void;
}

interface TeamSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: TeamListDto | null;
    handlers: TeamSettingsHandlers;
}

export function TeamSettingsModal({
    isOpen,
    onClose,
    team,
    handlers,
}: TeamSettingsModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedLeaderId, setSelectedLeaderId] = useState<string>('');
    const [confirmDeleteText, setConfirmDeleteText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [professors, setProfessors] = useState<Array<{ id: number; name: string; email: string }>>([]);
    const [selectedProfessorId, setSelectedProfessorId] = useState<string>('');
    const [isAddingProfessor, setIsAddingProfessor] = useState(false);

    const [activeView, setActiveView] = useState('info');

    useEffect(() => {
        if (team && isOpen) {
            setName(team.name);
            setDescription(team.description || '');
            const leader = team.members.find(m => m.role === 'leader');
            if (leader) {
                setSelectedLeaderId(String(leader.id));
            }
            setConfirmDeleteText('');
            setSelectedProfessorId('');
            setIsAddingProfessor(false);
            setActiveView('info');
        }
    }, [team, isOpen]);

    // 교수 목록 로드
    useEffect(() => {
        if (isOpen && activeView === 'members') {
            loadProfessors();
        }
    }, [isOpen, activeView]);

    const loadProfessors = async () => {
        try {
            const professorList = await getAllProfessors();
            // 이미 팀에 있는 교수는 제외
            const teamProfessorIds = team?.members
                .filter(m => professorList.some(p => p.id === m.id))
                .map(m => m.id) || [];
            const availableProfessors = professorList.filter(p => !teamProfessorIds.includes(p.id));
            setProfessors(availableProfessors);
        } catch (error) {
            console.error('Failed to load professors:', error);
        }
    };

    if (!team) return null;

    const handleUpdateTeamInfo = async () => {
        setIsSubmitting(true);
        try {
            const updatedTeam = await updateTeam(team.id, name, description);
            handlers.onTeamUpdate(updatedTeam);
            toast.success('팀 정보가 수정되었습니다.');
        } catch (error) {
            toast.error(`팀 정보 수정에 실패했습니다: ${error instanceof Error ? error.message : ''}`);
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
            toast.success('팀장이 변경되었습니다.');
            handlers.onRefreshNeeded();
            onClose();
        } catch (error) {
            toast.error(`팀장 변경에 실패했습니다: ${error instanceof Error ? error.message : ''}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveMember = async (memberId: number, memberName: string) => {
        if (!window.confirm(`정말 ${memberName}님을 팀에서 삭제하시겠습니까?`)) return;

        setIsSubmitting(true);
        try {
            await removeMember(team.id, memberId);
            toast.success('팀원이 삭제되었습니다.');
            handlers.onRefreshNeeded();
            onClose();
        } catch (error) {
            toast.error(`팀원 삭제에 실패했습니다: ${error instanceof Error ? error.message : ''}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTeam = async () => {
        setIsSubmitting(true);
        try {
            await deleteTeam(team.id);
            handlers.onTeamDelete(team.id);
            toast.success('팀이 삭제되었습니다.');
            onClose();
        } catch (error) {
            toast.error('팀 삭제에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddProfessor = async () => {
        if (!selectedProfessorId) {
            alert('교수를 선택해주세요.');
            return;
        }

        setIsSubmitting(true);
        try {
            await addProfessorToTeam(team.id, Number(selectedProfessorId));
            alert('교수가 팀에 추가되었습니다.');
            setSelectedProfessorId('');
            setIsAddingProfessor(false);
            handlers.onRefreshNeeded();
            onClose();
        } catch (error) {
            alert(`교수 추가에 실패했습니다: ${error instanceof Error ? error.message : ''}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl h-[70vh] flex flex-col p-0">
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
                        {/* 정보 수정 탭 */}
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
                                        <div className="flex items-center justify-between">
                                            <Label>팀원 목록</Label>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setIsAddingProfessor(!isAddingProfessor)}
                                                disabled={isSubmitting}
                                            >
                                                <UserPlus className="w-4 h-4 mr-1" />
                                                교수 추가
                                            </Button>
                                        </div>

                                        {isAddingProfessor && (
                                            <div className="flex gap-2 p-3 border rounded-md bg-muted/20">
                                                <Select
                                                    value={selectedProfessorId}
                                                    onValueChange={setSelectedProfessorId}
                                                    disabled={isSubmitting}
                                                >
                                                    <SelectTrigger className="flex-1">
                                                        <SelectValue placeholder="교수를 선택하세요" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {professors.length === 0 ? (
                                                            <div className="p-2 text-sm text-muted-foreground">
                                                                추가 가능한 교수가 없습니다
                                                            </div>
                                                        ) : (
                                                            professors.map(prof => (
                                                                <SelectItem key={prof.id} value={String(prof.id)}>
                                                                    {prof.name} ({prof.email})
                                                                </SelectItem>
                                                            ))
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    size="sm"
                                                    onClick={handleAddProfessor}
                                                    disabled={!selectedProfessorId || isSubmitting}
                                                >
                                                    추가
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setIsAddingProfessor(false);
                                                        setSelectedProfessorId('');
                                                    }}
                                                    disabled={isSubmitting}
                                                >
                                                    취소
                                                </Button>
                                            </div>
                                        )}

                                        <ScrollArea className="h-[200px] rounded-md border">
                                            <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                                                {team.members.filter(m => m.role !== 'leader').map(member => (
                                                    <div key={member.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                                        <span>{member.name}</span>
                                                        <Button size="sm" variant="destructive" onClick={() => handleRemoveMember(member.id, member.name)} disabled={isSubmitting}>삭제</Button>
                                                    </div>
                                                ))}
                                                {team.members.length === 1 && <p className="text-sm text-muted-foreground p-2">팀원이 없습니다.</p>}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </CardContent>
                            </Card>
                        )}


                        {/* 팀 삭제 탭 */}
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
        </Dialog >
    );
}