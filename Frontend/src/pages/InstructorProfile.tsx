import { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { Icons } from "../lib/icons";
import BackgroundBlobs from "../components/ui/BackgroundBlobs";
import toast from "react-hot-toast";
import {
  getProfileRequest,
  updateProfileRequest,
  type UpdateUserProfilePayload,
  type UserProfile,
} from "../lib/api";
import { useAuthStore } from "../store/authStore";

type ActionType = "profile" | null;

type ProfileDraft = {
  name: string;
  avatar_url: string;
  phone_number: string;
  address: string;
  gender: string;
  date_of_birth: string;
};

const emptyProfile: UserProfile = {
  name: "",
  email: "",
  avatar_url: "",
  date_of_birth: "",
  gender: "",
  phone_number: "",
  address: "",
};

const InstructorProfile = () => {
  const { token } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [draft, setDraft] = useState<ProfileDraft>({
    name: "",
    avatar_url: "",
    phone_number: "",
    address: "",
    gender: "",
    date_of_birth: "",
  });

  const avatarFallback = useMemo(() => {
    const name = profile.name.trim() || "Instructor";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=ffffff`;
  }, [profile.name]);

  const loadProfile = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getProfileRequest(token);
      setProfile(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load profile";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [token]);

  const openEditProfile = () => {
    setDraft({
      name: profile.name || "",
      avatar_url: profile.avatar_url || "",
      phone_number: profile.phone_number || "",
      address: profile.address || "",
      gender: profile.gender || "",
      date_of_birth: profile.date_of_birth || "",
    });
    setActiveAction("profile");
  };

  const closeAction = () => {
    if (!saving) {
      setActiveAction(null);
    }
  };

  const handleSave = async () => {
    if (!token) {
      toast.error("Please log in again.");
      return;
    }

    const nextName = draft.name.trim();
    if (!nextName) {
      toast.error("Name cannot be empty.");
      return;
    }

    const payload: UpdateUserProfilePayload = {
      name: nextName,
      avatar_url: draft.avatar_url.trim() || null,
      phone_number: draft.phone_number.trim() || null,
      address: draft.address.trim() || null,
      gender: draft.gender.trim() || null,
      date_of_birth: draft.date_of_birth.trim() || null,
    };

    setSaving(true);
    try {
      await updateProfileRequest(token, payload);
      toast.success("Profile updated successfully.");
      setActiveAction(null);
      await loadProfile();
      window.dispatchEvent(new Event("profile-updated"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 relative">
      <BackgroundBlobs />
      <div className="max-w-4xl mx-auto relative z-10">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-800">My Profile</h1>
            <Badge className="bg-indigo-100 text-indigo-700">Instructor</Badge>
          </div>
          <p className="text-slate-500">
            Manage your instructor account details.
          </p>
        </header>

        {loading ? (
          <Card className="p-8 text-center text-slate-500">Loading profile...</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-6">
              <Card className="p-6 text-center">
                <img
                  src={profile.avatar_url || avatarFallback}
                  alt={profile.name || "Instructor"}
                  onError={(event) => {
                    event.currentTarget.src = avatarFallback;
                  }}
                  className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border border-slate-200"
                />
                <h2 className="text-xl font-bold text-slate-800">
                  {profile.name || "Instructor"}
                </h2>
                <p className="text-sm text-indigo-600 font-semibold mb-4">
                  {profile.email}
                </p>

                <Button variant="secondary" className="w-full" onClick={openEditProfile}>
                  <Icons.Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </Card>
            </div>

            <div className="md:col-span-2 space-y-6">
              <Card className="p-8">
                <section className="mb-8">
                  <h3 className="text-lg font-bold text-slate-800 mb-3">Contact</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400 uppercase text-xs">Phone</p>
                      <p className="text-slate-700">{profile.phone_number || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase text-xs">Gender</p>
                      <p className="text-slate-700">{profile.gender || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase text-xs">Date of birth</p>
                      <p className="text-slate-700">{profile.date_of_birth || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase text-xs">Address</p>
                      <p className="text-slate-700">{profile.address || "Not set"}</p>
                    </div>
                  </div>
                </section>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={activeAction === "profile"} onClose={closeAction}>
        <div className="p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Edit Profile</h2>
          <p className="text-sm text-slate-500 mb-6">
            Changes are saved directly to the backend profile.
          </p>

          <div className="space-y-3">
            <Input
              placeholder="Name"
              value={draft.name}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
            />
            <Input
              placeholder="Avatar URL"
              value={draft.avatar_url}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  avatar_url: e.target.value,
                }))
              }
            />
            <Input
              placeholder="Phone Number"
              value={draft.phone_number}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  phone_number: e.target.value,
                }))
              }
            />
            <Input
              placeholder="Gender"
              value={draft.gender}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  gender: e.target.value,
                }))
              }
            />
            <Input
              type="date"
              value={draft.date_of_birth}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  date_of_birth: e.target.value,
                }))
              }
            />
            <Input
              placeholder="Address"
              value={draft.address}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  address: e.target.value,
                }))
              }
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={closeAction} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InstructorProfile;
