import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Plus, 
  Users, 
  UserCheck,
  Settings,
  Mail,
  Phone,
  Calendar,
  Filter,
  AlertTriangle
} from 'lucide-react';

// Note: The backend API for listing and managing users is not yet defined.
// This component uses mock data for demonstration purposes.
// An API like `GET /users` would be required to replace this.

export function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');

  const users = [
    {
      id: 1,
      name: '김영희',
      email: 'younghee@university.ac.kr',
      role: 'student',
      department: '컴퓨터공학과',
      studentId: '2021001234',
      status: 'active',
      lastLogin: '2024-03-10 09:30',
      createdAt: '2024-02-15',
      phone: '010-1234-5678',
      avatar: null,
      currentTeam: '팀 Alpha',
      project: 'AI 기반 스마트 캠퍼스 플랫폼'
    },
    {
      id: 2,
      name: '김교수',
      email: 'kim.prof@university.ac.kr',
      role: 'professor',
      department: '컴퓨터공학과',
      employeeId: 'P2020001',
      status: 'active',
      lastLogin: '2024-03-10 14:20',
      createdAt: '2024-01-10',
      phone: '010-2345-6789',
      avatar: null,
      courses: ['캡스톤디자인1', '소프트웨어공학'],
      managedTeams: 12
    },
    {
      id: 3,
      name: '이철수',
      email: 'cheolsu@university.ac.kr',
      role: 'student',
      department: '컴퓨터공학과',
      studentId: '2021001235',
      status: 'active',
      lastLogin: '2024-03-09 16:45',
      createdAt: '2024-02-15',
      phone: '010-3456-7890',
      avatar: null,
      currentTeam: '팀 Alpha',
      project: 'AI 기반 스마트 캠퍼스 플랫폼'
    },
    {
      id: 4,
      name: '박민정',
      email: 'minjung@university.ac.kr',
      role: 'student',
      department: '소프트웨어학과',
      studentId: '2020005678',
      status: 'inactive',
      lastLogin: '2024-02-28 10:15',
      createdAt: '2024-02-01',
      phone: '010-4567-8901',
      avatar: null,
      currentTeam: '팀 Beta',
      project: '블록체인 기반 투표 시스템'
    }
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge variant="destructive">관리자</Badge>;
      case 'professor': return <Badge variant="default">교수</Badge>;
      case 'student': return <Badge variant="secondary">학생</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="default" className="bg-green-100 text-green-800">활성</Badge>;
      case 'inactive': return <Badge variant="outline">비활성</Badge>;
      case 'suspended': return <Badge variant="destructive">정지</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.department.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedTab === 'all') return matchesSearch;
    return matchesSearch && user.role === selectedTab;
  });

  const userStats = {
    total: users.length,
    students: users.filter(u => u.role === 'student').length,
    professors: users.filter(u => u.role === 'professor').length,
    active: users.filter(u => u.status === 'active').length
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">사용자 관리</h1>
          <p className="text-muted-foreground">시스템 사용자를 관리하고 권한을 설정하세요</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            필터
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            사용자 추가
          </Button>
        </div>
      </div>
      
      <Card className="border-l-4 border-yellow-400">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            <div>
              <p className="font-semibold">개발자 참고</p>
              <p className="text-sm text-muted-foreground">
                이 페이지는 현재 목업(mock) 데이터를 사용하고 있습니다. 사용자 목록을 위한 백엔드 API (예: GET /api/users)가 필요합니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 사용자 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{userStats.total}</p>
                <p className="text-sm text-muted-foreground">전체 사용자</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <UserCheck className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{userStats.students}</p>
                <p className="text-sm text-muted-foreground">학생</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <UserCheck className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{userStats.professors}</p>
                <p className="text-sm text-muted-foreground">교수</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chart-4/10 rounded-lg">
                <UserCheck className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{userStats.active}</p>
                <p className="text-sm text-muted-foreground">활성 사용자</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="이름, 이메일, 학과로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 사용자 목록 */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="student">학생</TabsTrigger>
          <TabsTrigger value="professor">교수</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          <div className="grid gap-4">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-medium">{user.name}</h3>
                            {getRoleBadge(user.role)}
                            {getStatusBadge(user.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-sm text-muted-foreground">{user.department}</p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Settings className="h-4 w-4 mr-2" />
                            설정
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4 mr-2" />
                            메시지
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {user.role === 'student' ? user.studentId : user.employeeId}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{user.phone}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>가입: {user.createdAt}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          <span>최근 접속: {user.lastLogin}</span>
                        </div>
                      </div>
                      
                      {user.role === 'student' && user.currentTeam && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">현재 프로젝트</p>
                          <p className="text-sm text-muted-foreground">
                            {user.currentTeam} • {user.project}
                          </p>
                        </div>
                      )}
                      
                      {user.role === 'professor' && user.courses && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">담당 강좌</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.courses.map((course, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {course}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            관리 팀: {user.managedTeams}개
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">검색 조건에 맞는 사용자가 없습니다.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}