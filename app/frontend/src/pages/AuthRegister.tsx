import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthRegister() {
  const navigate = useNavigate();
  const { registerWithPassword } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      toast.error("请填写邮箱和密码");
      return;
    }
    if (password.length < 8) {
      toast.error("密码长度至少 8 位");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    setSubmitting(true);
    try {
      await registerWithPassword(email.trim(), password, name.trim() || undefined);
      toast.success("注册成功，已自动登录");
      navigate("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "注册失败";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md border-slate-700/50 bg-[#0a1528]">
        <CardHeader>
          <CardTitle className="text-slate-100">邮箱注册</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
            <Input
              placeholder="姓名（可选）"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
            />
            <Input
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="密码（至少 8 位）"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
            <Input
              type="password"
              placeholder="确认密码"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "注册中..." : "注册"}
            </Button>
          </form>

          <p className="text-xs text-slate-400 mt-4">
            已有账号？
            <Link to="/auth/login" className="text-violet-400 hover:text-violet-300 ml-1">
              去登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
