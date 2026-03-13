import React, { useEffect, useState } from "react";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Icons } from "../lib/icons";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import {
  getProfileRequest,
  updateProfileRequest,
  type UserProfile,
} from "../lib/api";

const normalizeFromApi = (value: string | undefined) => (value || "").trim();
const forcePersistEmpty = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? " " : value;
};

const Profile = () => {
  const { role, token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [invitationCode, setInvitationCode] = useState("");
  const [formData, setFormData] = useState<UserProfile>({
    name: "",
    email: "",
    avatar_url: "",
    date_of_birth: "",
    gender: "",
    phone_number: "",
    address: "",
  });

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!token) {
        setInitializing(false);
        return;
      }

      try {
        const data = await getProfileRequest(token);
        if (!active) {
          return;
        }
        setFormData({
          name: normalizeFromApi(data.name),
          email: normalizeFromApi(data.email),
          avatar_url: normalizeFromApi(data.avatar_url),
          date_of_birth: normalizeFromApi(data.date_of_birth),
          gender: normalizeFromApi(data.gender),
          phone_number: normalizeFromApi(data.phone_number),
          address: normalizeFromApi(data.address),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load profile";
        toast.error(message);
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [token]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (loading || !token) {
      return;
    }

    setLoading(true);
    try {
      const payload: UserProfile = {
        ...formData,
        avatar_url: forcePersistEmpty(formData.avatar_url),
        date_of_birth: forcePersistEmpty(formData.date_of_birth),
        gender: forcePersistEmpty(formData.gender),
        phone_number: forcePersistEmpty(formData.phone_number),
        address: forcePersistEmpty(formData.address),
      };

      await updateProfileRequest(token, payload);
      setFormData((prev) => ({
        ...prev,
        avatar_url: normalizeFromApi(prev.avatar_url),
        date_of_birth: normalizeFromApi(prev.date_of_birth),
        gender: normalizeFromApi(prev.gender),
        phone_number: normalizeFromApi(prev.phone_number),
        address: normalizeFromApi(prev.address),
      }));
      toast.success("Profile saved successfully!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save profile";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    if (upgrading) {
      return;
    }

    if (!invitationCode) {
      toast.error("Please enter an invitation code.");
      return;
    }

    setUpgrading(true);
    setTimeout(() => {
      toast("Upgrade endpoint is not available yet. Please contact admin.", {
        icon: "ℹ️",
      });
      setUpgrading(false);
    }, 500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-violet-600 to-indigo-600">
            User Profile
          </h1>
          <p className="text-slate-500 mt-2">
            Manage your personal information and preferences
          </p>
          {initializing && (
            <p className="text-xs text-slate-400 mt-2">Loading profile...</p>
          )}
        </div>
        <Button
          onClick={handleSave}
          className={loading ? "opacity-50 cursor-not-allowed" : ""}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            <>
              <Icons.Check />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card className="p-6 text-center space-y-4">
            <div className="relative w-32 h-32 mx-auto">
              <img
                src={`https://picsum.photos/id/${1}/200/200`}
                alt="Profile"
                className="w-full h-full rounded-full object-cover border-4 border-indigo-50"
              />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-lg capitalize">
                {role}
              </div>
            </div>
            <div className="pt-2">
              <h2 className="text-xl font-bold text-slate-800">
                {formData.name}
              </h2>
              <p className="text-indigo-600 font-medium">{formData.email}</p>
            </div>
          </Card>

          {role === "student" && (
            <Card className="p-6 space-y-4 border-indigo-100 bg-indigo-50/30">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-1 h-6 bg-indigo-500 rounded-full" />
                Upgrade Account
              </h3>
              <p className="text-sm text-slate-500">
                Become a manager to access advanced features.
              </p>
              <div className="space-y-3">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Icons.Key className="w-4 h-4" />
                  </div>
                  <Input
                    placeholder="Invitation Code"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    className="pl-9 py-2.5 text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleUpgrade}
                  className={`w-full py-2.5 text-sm ${upgrading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {upgrading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                      Upgrading...
                    </span>
                  ) : (
                    "Upgrade to Manager"
                  )}
                </Button>
              </div>
            </Card>
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-indigo-500 rounded-full" />
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-purple-500 rounded-full" />
              Personal Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Date of Birth
                </label>
                <Input
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Phone Number
                </label>
                <Input
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Address
                </label>
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street Address"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
