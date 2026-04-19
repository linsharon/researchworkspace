import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/dialog";
import { User, Upload, Lock, Globe, Edit2, Check, X } from "lucide-react";
import { type UserProfile } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const DEFAULT_AVATAR_URL = "https://api.dicebear.com/7.x/avataaars/svg?seed=default";
const USER_PROFILES_KEY = "rw-user-profiles";
const CURRENT_USER_KEY = "rw-current-user";

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: "", bio: "" });
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadProfile = (id: string) => {
    if (typeof window === "undefined") return null;
    try {
      const saved = window.localStorage.getItem(USER_PROFILES_KEY);
      const profiles: UserProfile[] = saved ? JSON.parse(saved) : [];
      return profiles.find((p) => p.id === id) || null;
    } catch {
      return null;
    }
  };

  const saveProfile = (profile: UserProfile) => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(USER_PROFILES_KEY);
      const profiles: UserProfile[] = saved ? JSON.parse(saved) : [];
      const filtered = profiles.filter((p) => p.id !== profile.id);
      window.localStorage.setItem(USER_PROFILES_KEY, JSON.stringify([...filtered, profile]));
      if (isOwnProfile) {
        window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!userId) return;
    const loaded = loadProfile(userId);
    if (loaded) {
      setProfile(loaded);
      setEditForm({ username: loaded.username, bio: loaded.bio || "" });
      setIsPublic(loaded.isPublic);
      setIsOwnProfile(authUser?.id === userId);
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [userId, authUser?.id]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const updated = { ...profile, avatar: base64, updatedAt: new Date().toISOString() };
      setProfile(updated);
      saveProfile(updated);
      setUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdits = () => {
    if (!profile || !editForm.username.trim()) return;
    const updated = {
      ...profile,
      username: editForm.username.trim(),
      bio: editForm.bio.trim(),
      isPublic,
      updatedAt: new Date().toISOString(),
    };
    setProfile(updated);
    saveProfile(updated);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-400">User profile not found.</p>
        </div>
      </AppLayout>
    );
  }

  if (!profile.isPublic && !isOwnProfile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-400">This profile is private.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header with Avatar */}
        <Card className="border-slate-700/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <div className="shrink-0">
                <img
                  src={profile.avatar || DEFAULT_AVATAR_URL}
                  alt={profile.username}
                  className="w-24 h-24 rounded-full border-2 border-cyan-400/50 object-cover"
                />
                {isOwnProfile && (
                  <label className="mt-3 inline-flex items-center justify-center w-full">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      asChild
                      disabled={uploadingAvatar}
                    >
                      <span>
                        <Upload className="w-3 h-3 mr-1" />
                        {uploadingAvatar ? "Uploading..." : "Change Avatar"}
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-400">Username</label>
                      <Input
                        value={editForm.username}
                        onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-400">Bio</label>
                      <Textarea
                        value={editForm.bio}
                        onChange={(e) => setEditForm((p) => ({ ...p, bio: e.target.value }))}
                        className="mt-1 text-sm min-h-[80px]"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded border border-slate-700/50 bg-slate-900/40">
                      {isPublic ? (
                        <Globe className="w-4 h-4 text-cyan-300" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-400" />
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => setIsPublic(!isPublic)}
                      >
                        {isPublic ? "Public Profile" : "Private Profile"}
                      </Button>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                        onClick={handleSaveEdits}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Save Changes
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => setIsEditing(false)}>
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl font-bold text-slate-100">{profile.username}</h1>
                      <Badge variant="outline" className={profile.isPublic ? "text-cyan-300 border-cyan-500/40" : "text-slate-400"}>
                        {profile.isPublic ? <Globe className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                        {profile.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{profile.email}</p>
                    {profile.bio && <p className="text-sm text-slate-300 mb-3">{profile.bio}</p>}
                    <p className="text-xs text-slate-500">Joined {profile.createdAt}</p>
                    {isOwnProfile && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 text-xs"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit Profile
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Info Card */}
        <Card className="border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">User ID:</span>
              <span className="text-slate-200 font-mono text-xs">{profile.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Visibility:</span>
              <span className="text-slate-200">{profile.isPublic ? "Public" : "Private"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Last Updated:</span>
              <span className="text-slate-200">{profile.updatedAt.split("T")[0]}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
