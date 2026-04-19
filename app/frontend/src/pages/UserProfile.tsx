import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lock, Globe, Upload, User, Trash2 } from "lucide-react";
import { type UserProfile } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const USER_PROFILES_KEY = "rw-user-profiles";
const PASSWORD_OVERRIDES_KEY = "rw-user-password-overrides";
const MY_DOWNLOADED_PACKAGES_KEY = "rw-my-downloaded-packages";
const COMMUNITY_PACKAGES_KEY = "rw-community-packages";

const emptyProfile = (userId: string, email: string, name?: string): UserProfile => ({
  userId,
  email,
  username: name || email.split("@")[0] || "User",
  bio: "",
  avatarUrl: "",
  isPublic: true,
  updatedAt: new Date().toISOString(),
});

export default function UserProfilePage() {
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const { user, logout } = useAuth();

  const effectiveUserId = userIdParam || user?.id || "";
  const isOwnProfile = !!user && effectiveUserId === user.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    if (!effectiveUserId) {
      setLoading(false);
      return;
    }

    try {
      const saved = window.localStorage.getItem(USER_PROFILES_KEY);
      const map: Record<string, UserProfile> = saved ? JSON.parse(saved) : {};
      let next = map[effectiveUserId] || null;

      if (!next && isOwnProfile && user) {
        next = emptyProfile(user.id, user.email, user.name);
        map[user.id] = next;
        window.localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(map));
      }

      setProfile(next);
      setUsername(next?.username || "");
      setBio(next?.bio || "");
      setIsPublic(next?.isPublic ?? true);
      setAvatarUrl(next?.avatarUrl || "");
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, isOwnProfile, user]);

  const canView = useMemo(() => {
    if (!profile) return false;
    if (isOwnProfile) return true;
    return profile.isPublic;
  }, [profile, isOwnProfile]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatarUrl(result || "");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    if (!user || !isOwnProfile) return;
    if (!username.trim()) {
      toast.error("Display name is required");
      return;
    }

    const nextProfile: UserProfile = {
      userId: user.id,
      email: user.email,
      username: username.trim(),
      bio: bio.trim(),
      avatarUrl,
      isPublic,
      updatedAt: new Date().toISOString(),
    };

    try {
      const saved = window.localStorage.getItem(USER_PROFILES_KEY);
      const map: Record<string, UserProfile> = saved ? JSON.parse(saved) : {};
      map[user.id] = nextProfile;
      window.localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(map));
      setProfile(nextProfile);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to save profile");
    }
  };

  const handleChangePassword = () => {
    if (!user || !isOwnProfile) return;
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      const saved = window.localStorage.getItem(PASSWORD_OVERRIDES_KEY);
      const map: Record<string, string> = saved ? JSON.parse(saved) : {};
      map[user.email.toLowerCase()] = newPassword;
      window.localStorage.setItem(PASSWORD_OVERRIDES_KEY, JSON.stringify(map));
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch {
      toast.error("Failed to update password");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !isOwnProfile) return;
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      toast.error("Type DELETE to confirm");
      return;
    }

    try {
      const profileRaw = window.localStorage.getItem(USER_PROFILES_KEY);
      const profiles: Record<string, UserProfile> = profileRaw ? JSON.parse(profileRaw) : {};
      delete profiles[user.id];
      window.localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(profiles));

      const downloadsRaw = window.localStorage.getItem(MY_DOWNLOADED_PACKAGES_KEY);
      const downloadsMap: Record<string, unknown[]> = downloadsRaw ? JSON.parse(downloadsRaw) : {};
      delete downloadsMap[user.id];
      window.localStorage.setItem(MY_DOWNLOADED_PACKAGES_KEY, JSON.stringify(downloadsMap));

      const communityRaw = window.localStorage.getItem(COMMUNITY_PACKAGES_KEY);
      const community = communityRaw ? JSON.parse(communityRaw) : [];
      const filtered = Array.isArray(community)
        ? community.filter((pkg: { ownerId?: string }) => pkg.ownerId !== user.id)
        : [];
      window.localStorage.setItem(COMMUNITY_PACKAGES_KEY, JSON.stringify(filtered));

      toast.success("Account deletion request processed");
      await logout();
    } catch {
      toast.error("Failed to delete account");
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 text-slate-400">Loading profile...</div>
      </AppLayout>
    );
  }

  if (!profile || !canView) {
    return (
      <AppLayout>
        <div className="p-6 text-slate-400">Profile not available.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        <Card className="border-slate-700/50 bg-[#0d1b30]">
          <CardHeader>
            <CardTitle className="text-sm text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-300" />
              Personal Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="space-y-2">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={avatarUrl || undefined} alt={username} />
                  <AvatarFallback className="bg-cyan-500/20 text-cyan-200 text-xl font-semibold">
                    {(username || profile.email || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isOwnProfile && (
                  <label className="inline-flex">
                    <Button size="sm" variant="outline" className="text-xs" asChild>
                      <span>
                        <Upload className="w-3 h-3 mr-1" />
                        Avatar
                      </span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-xs text-slate-400">Display Name</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={!isOwnProfile}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Email</label>
                  <Input value={profile.email} disabled className="mt-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Bio</label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    disabled={!isOwnProfile}
                    className="mt-1 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={isPublic ? "text-cyan-300 border-cyan-500/40" : "text-slate-400"}>
                    {isPublic ? <Globe className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                    {isPublic ? "Public" : "Private"}
                  </Badge>
                  {isOwnProfile && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setIsPublic((v) => !v)}>
                      Toggle Visibility
                    </Button>
                  )}
                </div>
                {isOwnProfile && (
                  <Button size="sm" className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white" onClick={handleSaveProfile}>
                    Save Profile
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {isOwnProfile && (
          <Card className="border-slate-700/50 bg-[#0d1b30]">
            <CardHeader>
              <CardTitle className="text-sm text-slate-100">Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="text-sm"
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="text-sm"
              />
              <Button size="sm" variant="outline" className="text-xs" onClick={handleChangePassword}>
                Update Password
              </Button>
            </CardContent>
          </Card>
        )}

        {isOwnProfile && (
          <Card className="border-red-500/30 bg-red-950/10">
            <CardHeader>
              <CardTitle className="text-sm text-red-300">Delete Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-400">
                This removes your local profile, your created community packages, and downloaded package records.
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder='Type "DELETE" to confirm'
                className="text-sm"
              />
              <Button size="sm" variant="outline" className="text-xs text-red-400 border-red-500/40" onClick={() => void handleDeleteAccount()}>
                <Trash2 className="w-3 h-3 mr-1" />
                Request Account Deletion
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
