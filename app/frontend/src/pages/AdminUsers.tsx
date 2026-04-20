import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Pencil, RefreshCw, Search, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import AppLayout from '@/components/AppLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/lib/i18n';
import { AdminUser, adminUsersApi } from '@/lib/admin-users-api';

type EditFormState = {
  email: string;
  username: string;
  avatarUrl: string;
  role: string;
  premiumPlan: 'premium' | 'free';
  paymentTag: 'paypal' | 'wechat' | 'none';
};

const ADMIN_ENTRY_EMAIL = 'pandalinjingjing@gmail.com';

const emptyForm: EditFormState = {
  email: '',
  username: '',
  avatarUrl: '',
  role: 'user',
  premiumPlan: 'free',
  paymentTag: 'none',
};

const formatDateTime = (value: string, lang: string) => {
  if (!value) return lang === 'zh' ? '暂无' : 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatDuration = (durationMs: number, lang: string) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (lang === 'zh') {
    if (hours > 0) return `${hours}小时 ${minutes}分钟`;
    if (minutes > 0) return `${minutes}分钟 ${seconds}秒`;
    return `${seconds}秒`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const avatarFallback = (user: AdminUser) => {
  const seed = user.username || user.email || user.userId;
  return seed.slice(0, 2).toUpperCase();
};

export default function AdminUsers() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const isZh = lang === 'zh';
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const isDesignatedAdmin = (user?.email || '').trim().toLowerCase() === ADMIN_ENTRY_EMAIL;

  const premiumCount = useMemo(() => users.filter((item) => item.isPremium).length, [users]);
  const adminCount = useMemo(() => users.filter((item) => item.role === 'admin').length, [users]);

  const syncFormFromUser = (target: AdminUser) => {
    setEditForm({
      email: target.email,
      username: target.username,
      avatarUrl: target.avatarUrl,
      role: target.role,
      premiumPlan: target.isPremium ? 'premium' : 'free',
      paymentTag: (target.paymentTag || 'none') as 'paypal' | 'wechat' | 'none',
    });
  };

  const loadUsers = async (nextQuery = query) => {
    setLoading(true);
    try {
      const response = await adminUsersApi.list(nextQuery);
      setUsers(response.items);
      setTotal(response.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isZh ? '加载用户失败' : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers('');
  }, []);

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const updated = await adminUsersApi.update(editingUser.userId, {
        email: editForm.email,
        username: editForm.username,
        avatarUrl: editForm.avatarUrl,
        role: editForm.role,
        isPremium: editForm.premiumPlan === 'premium',
        paymentTag: editForm.paymentTag === 'none' ? '' : editForm.paymentTag,
      });
      setUsers((prev) => prev.map((item) => (item.userId === updated.userId ? updated : item)));
      setEditOpen(false);
      setEditingUser(null);
      toast.success(isZh ? '用户信息已更新' : 'User updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isZh ? '更新失败' : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const updated = await adminUsersApi.resetPassword(resetTarget.userId, resetPassword);
      setUsers((prev) => prev.map((item) => (item.userId === updated.userId ? updated : item)));
      setResetTarget(null);
      setResetPassword('');
      toast.success(isZh ? '密码已重设' : 'Password reset');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isZh ? '重设密码失败' : 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (target: AdminUser) => {
    const confirmed = window.confirm(
      isZh
        ? `确定删除用户 ${target.email} 吗？此操作不可撤销。`
        : `Delete user ${target.email}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await adminUsersApi.remove(target.userId);
      setUsers((prev) => prev.filter((item) => item.userId !== target.userId));
      setTotal((prev) => Math.max(0, prev - 1));
      toast.success(isZh ? '用户已删除' : 'User deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isZh ? '删除失败' : 'Delete failed');
    }
  };

  if (!isDesignatedAdmin) {
    return (
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Card className="border-slate-700/50 bg-slate-950/40 text-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-amber-400" />
                {isZh ? 'Admin 入口仅对指定账户开放' : 'Admin access is limited to the designated account'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              {isZh ? '当前账户没有该管理入口显示权限。' : 'The current account does not have visibility access to this admin entry.'}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-[1500px] mx-auto space-y-4 text-slate-100">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{isZh ? 'Admin 用户管理' : 'Admin User Management'}</h1>
            <p className="text-sm text-slate-400">
              {isZh ? '查看已注册用户、最近登录信息、在线时长、地区与会员状态。' : 'Inspect registered users, login activity, online duration, location, and subscription status.'}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative w-full min-w-[240px] lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={isZh ? '搜索邮箱、用户名或用户 ID' : 'Search email, username, or user ID'}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={() => void loadUsers(query)}>
              <Search className="mr-2 h-4 w-4" />
              {isZh ? '搜索' : 'Search'}
            </Button>
            <Button onClick={() => void loadUsers(query)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {isZh ? '刷新' : 'Refresh'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card className="border-slate-700/50 bg-slate-950/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">{isZh ? '用户总数' : 'Total users'}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{total}</div></CardContent>
          </Card>
          <Card className="border-slate-700/50 bg-slate-950/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">{isZh ? '高级版用户' : 'Premium users'}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold text-amber-300">{premiumCount}</div></CardContent>
          </Card>
          <Card className="border-slate-700/50 bg-slate-950/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">{isZh ? '管理员数量' : 'Admin accounts'}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold text-cyan-300">{adminCount}</div></CardContent>
          </Card>
        </div>

        <Card className="border-slate-700/50 bg-slate-950/40">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isZh ? '用户' : 'User'}</TableHead>
                  <TableHead>{isZh ? '创建时间' : 'Created'}</TableHead>
                  <TableHead>{isZh ? '上次登录' : 'Last login'}</TableHead>
                  <TableHead>{isZh ? '在线时长' : 'Online duration'}</TableHead>
                  <TableHead>{isZh ? '位置 / IP' : 'Location / IP'}</TableHead>
                  <TableHead>{isZh ? '会员 / 付款' : 'Plan / Payment'}</TableHead>
                  <TableHead>{isZh ? '操作' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-400">
                      {isZh ? '正在加载用户数据...' : 'Loading users...'}
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-400">
                      {isZh ? '没有匹配的用户。' : 'No matching users.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((item) => (
                    <TableRow key={item.userId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-slate-700">
                            <AvatarImage src={item.avatarUrl || undefined} alt={item.username} />
                            <AvatarFallback>{avatarFallback(item)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-100">{item.username}</div>
                            <div className="truncate text-xs text-slate-400">{item.email}</div>
                            <div className="truncate text-[11px] text-slate-500">{item.userId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-300">{formatDateTime(item.createdAt, lang)}</TableCell>
                      <TableCell className="text-sm text-slate-300">{formatDateTime(item.lastLogin, lang)}</TableCell>
                      <TableCell className="text-sm text-slate-300">{formatDuration(item.onlineDurationMs, lang)}</TableCell>
                      <TableCell className="text-sm text-slate-300">
                        <div>{[item.country, item.city].filter(Boolean).join(' / ') || (isZh ? '未知' : 'Unknown')}</div>
                        <div className="text-xs text-slate-500">{item.lastSeenIp || (isZh ? '暂无 IP' : 'No IP')}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={item.role === 'admin' ? 'default' : 'outline'}>{item.role}</Badge>
                          <Badge variant={item.isPremium ? 'secondary' : 'outline'}>
                            {item.isPremium ? (isZh ? '高级版' : 'Premium') : (isZh ? '免费版' : 'Free')}
                          </Badge>
                          <Badge variant="outline">{item.paymentTag || (isZh ? '未标记' : 'Unassigned')}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingUser(item);
                              syncFormFromUser(item);
                              setEditOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            {isZh ? '编辑' : 'Edit'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setResetTarget(item);
                              setResetPassword('');
                            }}
                          >
                            <KeyRound className="mr-2 h-3.5 w-3.5" />
                            {isZh ? '重设密码' : 'Reset password'}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => void handleDelete(item)}>
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            {isZh ? '删除' : 'Delete'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isZh ? '编辑用户' : 'Edit user'}</DialogTitle>
            <DialogDescription>
              {isZh ? '可修改邮箱、用户名、头像、角色、会员状态和付款标签。' : 'Update email, username, avatar, role, premium status, and payment tag.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={editForm.email} onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email" />
            <Input value={editForm.username} onChange={(event) => setEditForm((prev) => ({ ...prev, username: event.target.value }))} placeholder={isZh ? '用户名' : 'Username'} />
            <Input value={editForm.avatarUrl} onChange={(event) => setEditForm((prev) => ({ ...prev, avatarUrl: event.target.value }))} placeholder={isZh ? '头像 URL' : 'Avatar URL'} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Select value={editForm.role} onValueChange={(value) => setEditForm((prev) => ({ ...prev, role: value }))}>
                <SelectTrigger><SelectValue placeholder={isZh ? '角色' : 'Role'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">user</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={editForm.premiumPlan} onValueChange={(value: 'premium' | 'free') => setEditForm((prev) => ({ ...prev, premiumPlan: value }))}>
                <SelectTrigger><SelectValue placeholder={isZh ? '会员状态' : 'Plan'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">{isZh ? '免费版' : 'Free'}</SelectItem>
                  <SelectItem value="premium">{isZh ? '高级版' : 'Premium'}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={editForm.paymentTag} onValueChange={(value: 'paypal' | 'wechat' | 'none') => setEditForm((prev) => ({ ...prev, paymentTag: value }))}>
                <SelectTrigger><SelectValue placeholder={isZh ? '付款标签' : 'Payment tag'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isZh ? '未标记' : 'Unassigned'}</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="wechat">WeChat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{isZh ? '取消' : 'Cancel'}</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>{saving ? (isZh ? '保存中...' : 'Saving...') : (isZh ? '保存' : 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resetTarget)} onOpenChange={(open) => {
        if (!open) {
          setResetTarget(null);
          setResetPassword('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isZh ? '重设密码' : 'Reset password'}</DialogTitle>
            <DialogDescription>
              {resetTarget
                ? (isZh ? `为 ${resetTarget.email} 设置新密码。` : `Set a new password for ${resetTarget.email}.`)
                : ''}
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            value={resetPassword}
            onChange={(event) => setResetPassword(event.target.value)}
            placeholder={isZh ? '输入至少 8 位的新密码' : 'Enter a new password with at least 8 characters'}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResetTarget(null);
              setResetPassword('');
            }}>{isZh ? '取消' : 'Cancel'}</Button>
            <Button onClick={() => void handleResetPassword()} disabled={resetting || resetPassword.trim().length < 8}>
              {resetting ? (isZh ? '提交中...' : 'Submitting...') : (isZh ? '确认重设' : 'Confirm reset')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}