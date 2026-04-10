import { useState } from "react";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { Icons } from "../lib/icons";
import BackgroundBlobs from "../components/ui/BackgroundBlobs";
import toast from "react-hot-toast";

const AVAILABILITY_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type QuickAction = "bio" | "password" | "availability" | null;

const InstructorProfile = () => {
  const isPreviewInstructor =
    sessionStorage.getItem("instructor_preview") === "true";
  const [profile, setProfile] = useState({
    name: "Instructor One",
    email: "instructor1@fitflow.com",
    bio: "Passionate yoga instructor with over 10 years of experience in Hatha and Vinyasa flow. Dedicated to helping students find balance, strength, and mindfulness through movement.",
    specializations: [
      "Vinyasa Flow",
      "Hatha Yoga",
      "Mindfulness Meditation",
      "Power Yoga",
    ],
    certifications: [
      "RYT-500 Certified Yoga Teacher",
      "Advanced Anatomy for Yoga",
      "First Aid & CPR",
    ],
    teachingSince: "2015",
    totalClasses: 1240,
    rating: 4.9,
  });
  const [activeAction, setActiveAction] = useState<QuickAction>(null);
  const [bioDraft, setBioDraft] = useState(profile.bio);
  const [availability, setAvailability] = useState<string[]>([
    "Mon",
    "Wed",
    "Fri",
  ]);
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
  });

  const openAction = (action: Exclude<QuickAction, null>) => {
    if (action === "bio") {
      setBioDraft(profile.bio);
    }
    if (action === "password") {
      setPasswordDraft({
        currentPassword: "",
        nextPassword: "",
        confirmPassword: "",
      });
    }
    setActiveAction(action);
  };

  const closeAction = () => {
    setActiveAction(null);
  };

  const toggleAvailability = (day: string) => {
    setAvailability((prev) =>
      prev.includes(day)
        ? prev.filter((value) => value !== day)
        : [...prev, day],
    );
  };

  const handleSaveAction = () => {
    if (activeAction === "bio") {
      const nextBio = bioDraft.trim();
      if (!nextBio) {
        toast.error("Bio cannot be empty.");
        return;
      }
      setProfile((prev) => ({ ...prev, bio: nextBio }));
      toast.success("Profile bio updated in demo mode.");
      closeAction();
      return;
    }

    if (activeAction === "password") {
      if (
        !passwordDraft.currentPassword.trim() ||
        !passwordDraft.nextPassword.trim() ||
        !passwordDraft.confirmPassword.trim()
      ) {
        toast.error("Please fill in all password fields.");
        return;
      }

      if (passwordDraft.nextPassword !== passwordDraft.confirmPassword) {
        toast.error("New password and confirmation do not match.");
        return;
      }

      toast.success("Password updated in demo mode.");
      closeAction();
      return;
    }

    if (activeAction === "availability") {
      toast.success("Availability saved in demo mode.");
      closeAction();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 relative">
      <BackgroundBlobs />
      <div className="max-w-4xl mx-auto relative z-10">
        {isPreviewInstructor && (
          <Card className="mb-6 p-4 border-dashed border-indigo-200 bg-indigo-50/70">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <Badge className="bg-indigo-100 text-indigo-700 mb-2">
                  Demo Mode
                </Badge>
              </div>
              <Icons.User className="w-6 h-6 text-indigo-500" />
            </div>
          </Card>
        )}

        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-800">My Profile</h1>
            {isPreviewInstructor && (
              <Badge className="bg-slate-900 text-white">Preview</Badge>
            )}
          </div>
          <p className="text-slate-500">
            Manage your public instructor profile and teaching details.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Avatar & Quick Stats */}
          <div className="md:col-span-1 space-y-6">
            <Card className="p-6 text-center">
              <div className="w-24 h-24 bg-linear-to-tr from-indigo-500 to-violet-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {profile.name.charAt(0)}
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                {profile.name}
              </h2>
              <p className="text-sm text-indigo-600 font-semibold mb-4 italic">
                Lead Instructor
              </p>

              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-xs text-slate-400 uppercase font-bold">
                    Rating
                  </p>
                  <p className="text-lg font-bold text-slate-800">
                    ⭐ {profile.rating}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 uppercase font-bold">
                    Classes
                  </p>
                  <p className="text-lg font-bold text-slate-800">
                    {profile.totalClasses}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Icons.Settings className="w-4 h-4 text-slate-400" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  onClick={() => openAction("bio")}
                >
                  Edit Profile Bio
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  onClick={() => openAction("password")}
                >
                  Change Password
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                  onClick={() => openAction("availability")}
                >
                  Manage Availability
                </Button>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                  Current Availability
                </p>
                <div className="flex flex-wrap gap-2">
                  {availability.map((day) => (
                    <Badge key={day} className="bg-emerald-50 text-emerald-700">
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Bio & Experience */}
          <div className="md:col-span-2 space-y-6">
            <Card className="p-8">
              <section className="mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-3">
                  About Me
                </h3>
                <p className="text-slate-600 leading-relaxed">{profile.bio}</p>
              </section>

              <section className="mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-3">
                  Specializations
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.specializations.map((spec) => (
                    <Badge
                      key={spec}
                      className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1"
                    >
                      {spec}
                    </Badge>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-3">
                  Certifications
                </h3>
                <ul className="space-y-3">
                  {profile.certifications.map((cert) => (
                    <li
                      key={cert}
                      className="flex items-center gap-3 text-slate-600"
                    >
                      <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <Icons.Check />
                      </div>
                      {cert}
                    </li>
                  ))}
                </ul>
              </section>
            </Card>
          </div>
        </div>
      </div>

      <Modal isOpen={activeAction !== null} onClose={closeAction}>
        <div className="p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {activeAction === "bio"
              ? "Edit Profile Bio"
              : activeAction === "password"
                ? "Change Password"
                : "Manage Availability"}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {activeAction === "bio"
              ? "Update the bio shown on your instructor profile."
              : activeAction === "password"
                ? "This is a demo-only password change flow."
                : "Toggle your teaching days for presentation purposes."}
          </p>

          {activeAction === "bio" && (
            <div className="space-y-3">
              <textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
              />
            </div>
          )}

          {activeAction === "password" && (
            <div className="space-y-3">
              <Input
                type="password"
                placeholder="Current password"
                value={passwordDraft.currentPassword}
                onChange={(e) =>
                  setPasswordDraft((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
              />
              <Input
                type="password"
                placeholder="New password"
                value={passwordDraft.nextPassword}
                onChange={(e) =>
                  setPasswordDraft((prev) => ({
                    ...prev,
                    nextPassword: e.target.value,
                  }))
                }
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={passwordDraft.confirmPassword}
                onChange={(e) =>
                  setPasswordDraft((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
              />
            </div>
          )}

          {activeAction === "availability" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AVAILABILITY_DAYS.map((day) => {
                  const selected = availability.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => toggleAvailability(day)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
                        selected
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-700"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">
                Select the days you want to teach in the demo roster.
              </p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={closeAction}>
              Cancel
            </Button>
            <Button onClick={handleSaveAction}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InstructorProfile;
