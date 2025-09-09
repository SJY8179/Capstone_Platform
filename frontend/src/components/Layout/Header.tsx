import React from "react";
import { Bell, Search, User as UserIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string; // 'admin' | 'professor' | 'student'
  avatar?: string | null;
}

interface HeaderProps {
  user: AppUser;
}

export function Header({ user }: HeaderProps) {
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "professor":
        return "default";
      case "student":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "관리자";
      case "professor":
        return "교수";
      case "student":
        return "학생";
      default:
        return role;
    }
  };

  return (
    <header className="h-16 border-b bg-background px-6 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="프로젝트, 팀, 과제 검색…" className="pl-10" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative" aria-label="알림">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive text-[10px] leading-3 text-destructive-foreground flex items-center justify-center">
            3
          </span>
        </Button>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{user.name}</p>
              <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                {getRoleLabel(user.role)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Avatar>
            <AvatarImage src={user.avatar || undefined} alt={user.name} />
            <AvatarFallback>
              <UserIcon className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
