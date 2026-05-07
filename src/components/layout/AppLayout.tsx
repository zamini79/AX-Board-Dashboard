import { ReactNode, useState, lazy, Suspense } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { CommandSearch, useCommandSearch } from './CommandSearch';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Search,
  Bell,
  Menu,
  LogOut,
  Sparkles,
  LayoutDashboard,
  TrendingUp,
  CheckSquare,
  ClipboardList,
  DollarSign,
  Calendar,
  Settings,
  UserCheck,
  Trophy,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AiFloatingButton } from '@/components/ai/AiFloatingButton';
import { AiAdvisorPanel } from '@/components/ai/AiAdvisorPanel';
import { NotificationPanel } from './NotificationPanel';

const primaryNavItems: { title: string; url: string; icon: LucideIcon; managerOnly?: boolean }[] = [
  { title: '대시보드', url: '/', icon: LayoutDashboard },
  { title: 'KPI', url: '/kpis', icon: TrendingUp },
  { title: '과제', url: '/tasks', icon: CheckSquare },
  { title: 'To-Do', url: '/todos', icon: ClipboardList },
  { title: '목표관리', url: '/performance', icon: Trophy },
  { title: '예산', url: '/budget', icon: DollarSign },
];

const secondaryNavItems: { title: string; url: string; icon: LucideIcon; adminOnly?: boolean; managerOnly?: boolean }[] = [
  { title: '일정', url: '/schedule', icon: Calendar },
  { title: '사용자 승인', url: '/user-approval', icon: UserCheck, adminOnly: true },
  { title: '설정', url: '/settings', icon: Settings },
];

const allNavItems = [...primaryNavItems, ...secondaryNavItems];

const getRoleLabel = (role: string | undefined) => {
  const labels: Record<string, string> = {
    admin: '관리자',
    ceo: 'CEO',
    owner: '담당자',
    editor: '편집자',
  };
  return labels[role || ''] || '미지정';
};

const getRoleBadgeVariant = (role: string | undefined) => {
  if (role === 'admin') return 'destructive' as const;
  if (role === 'ceo') return 'default' as const;
  if (role === 'owner') return 'secondary' as const;
  return 'outline' as const;
};

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function AppLayout({ children, title, description, actions }: AppLayoutProps) {
  const { open: searchOpen, setOpen: setSearchOpen } = useCommandSearch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const { profile, role, isManager, isAdmin } = useUserProfile();

  const visiblePrimary = primaryNavItems.filter((item) => !item.managerOnly || isManager);
  const visibleSecondary = secondaryNavItems.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.managerOnly) return isManager;
    return true;
  });
  const visibleNavItems = [...visiblePrimary, ...visibleSecondary];
  const isActive = (url: string) => (url === '/' ? location.pathname === '/' : location.pathname.startsWith(url));
  const isSecondaryActive = visibleSecondary.some((item) => isActive(item.url));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex h-full items-center gap-4 px-4 md:px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 no-underline">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight hidden sm:inline text-foreground">AX Board</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {visiblePrimary.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.url === '/'}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.url)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
                activeClassName=""
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            ))}

            {/* More dropdown for secondary items */}
            {visibleSecondary.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isSecondaryActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span>더보기</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {visibleSecondary.map((item) => (
                    <DropdownMenuItem key={item.url} asChild>
                      <Link
                        to={item.url}
                        className={`flex items-center gap-2 ${
                          isActive(item.url) ? 'text-primary font-medium' : ''
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Search */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground h-9 px-3"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">검색</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-md border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-1">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className="sm:hidden h-9 w-9">
              <Search className="h-4 w-4" />
            </Button>

            <ThemeToggle />

            <NotificationPanel />

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <Avatar className="h-8 w-8 ring-2 ring-border">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {profile?.full_name?.slice(0, 2) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{profile?.full_name || '사용자'}</p>
                    <Badge variant={getRoleBadgeVariant(role?.role)} className="w-fit text-[10px] px-1.5 py-0">
                      {getRoleLabel(role?.role)}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {actions}

            {/* Mobile Menu Trigger */}
            <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              AX Board
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-3">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.url === '/'}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.url)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
                activeClassName=""
                onClick={() => setMobileOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Page Header (optional) */}
      {title && (
        <div className="border-b border-border/50 bg-background px-4 md:px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6">
        {children}
      </main>

      {/* Command Search */}
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* AI Advisor */}
      <AiFloatingButton onClick={() => setAiOpen(true)} />
      <AiAdvisorPanel open={aiOpen} onOpenChange={setAiOpen} />
    </div>
  );
}
