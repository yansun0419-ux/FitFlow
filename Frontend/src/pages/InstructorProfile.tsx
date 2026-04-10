import { useState } from "react";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { Icons } from "../lib/icons";
import BackgroundBlobs from "../components/ui/BackgroundBlobs";

const InstructorProfile = () => {
  const isPreviewInstructor =
    sessionStorage.getItem("instructor_preview") === "true";
  const [profile] = useState({
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
                <p className="text-sm text-slate-700 font-medium">
                  This profile is a presentation-only mock so you can show the
                  instructor experience even if the backend is offline.
                </p>
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
                >
                  Edit Profile Bio
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                >
                  Change Password
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                >
                  Manage Availability
                </Button>
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
    </div>
  );
};

export default InstructorProfile;
