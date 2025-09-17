import { Button } from '@/components/ui/button';
import { Pencil, Users, Trash2 } from 'lucide-react';

interface SidebarNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export function SidebarNav({ activeView, setActiveView }: SidebarNavProps) {
    const commonClasses = "w-full justify-start";

    return (
        <nav className="flex flex-col gap-1 h-full">
            <Button
                variant={activeView === 'info' ? 'secondary' : 'ghost'}
                className={commonClasses}
                onClick={() => setActiveView('info')}
            >
                <Pencil className="w-4 h-4 mr-2" /> 정보 수정
            </Button>
            <Button
                variant={activeView === 'members' ? 'secondary' : 'ghost'}
                className={commonClasses}
                onClick={() => setActiveView('members')}
            >
                <Users className="w-4 h-4 mr-2" /> 팀원 관리
            </Button>
            <Button
                variant={activeView === 'danger' ? 'secondary' : 'ghost'}
                className={`${commonClasses} text-destructive hover:bg-destructive/10 hover:text-destructive mt-auto`}
                onClick={() => setActiveView('danger')}
            >
                <Trash2 className="w-4 h-4 mr-2" /> 팀 삭제
            </Button>
        </nav>
    );
}