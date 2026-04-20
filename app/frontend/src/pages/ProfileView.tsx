import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User2, ArrowLeft } from "lucide-react";
import { type UserProfile } from "@/lib/data";
import { userProfileApi } from "@/lib/user-profile-api";
import { useI18n } from "@/lib/i18n";

export default function ProfileView() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        const found = await userProfileApi.getPublicProfile(userId);
        setIsPrivate(false);
        setProfile(found);
      } catch {
        setProfile(null);
        setIsPrivate(true);
      }
      setLoading(false);
    };

    void loadProfile();
  }, [userId]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 text-center">{isZh ? "加载中..." : "Loading..."}</div>
      </AppLayout>
    );
  }

  if (isPrivate || !profile) {
    return (
      <AppLayout>
        <div className="p-6 max-w-2xl mx-auto">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back
          </Button>
          <Card className="border-slate-700/50 bg-slate-800/30">
            <CardContent className="p-8 text-center">
              <User2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-slate-200 mb-1">{isZh ? "未找到个人资料" : "Profile Not Found"}</h2>
              <p className="text-sm text-slate-400">{isZh ? "此个人资料是私有的或者不存在。" : "This profile is private or does not exist."}</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-5">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back
        </Button>

        <Card className="border-slate-700/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profile.avatarUrl} alt={profile.username} />
                <AvatarFallback className="bg-cyan-500/20 text-cyan-200 text-xl font-semibold">
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-slate-100">{profile.username}</h1>
                <p className="text-xs text-slate-400 mt-0.5">{profile.email}</p>
                {profile.bio && (
                  <p className="text-sm text-slate-300 mt-2">{profile.bio}</p>
                )}
                <p className="text-[11px] text-slate-500 mt-3">
                  Profile updated: {profile.updatedAt}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
