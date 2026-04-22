import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate, Link, useLocation } from "react-router-dom";
import { Icons } from "../lib/icons";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { getProfileRequest } from "../lib/api";

const normalizeFromApi = (value: string | undefined) => (value || "").trim();

const Navbar = () => {
  const {
    isAuthenticated: realIsAuthenticated,
    logout,
    token,
    role: realRole,
  } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Persistence logic for the instructor preview
  const [isPreviewInstructor, setIsPreviewInstructor] = useState(
    sessionStorage.getItem("instructor_preview") === "true",
  );
  const [isPreviewManager, setIsPreviewManager] = useState(
    sessionStorage.getItem("manager_preview") === "true",
  );

  useEffect(() => {
    if (location.pathname.startsWith("/instructor")) {
      sessionStorage.setItem("instructor_preview", "true");
      setIsPreviewInstructor(true);
    }
    if (location.pathname.startsWith("/manager")) {
      sessionStorage.setItem("manager_preview", "true");
      setIsPreviewManager(true);
    }
  }, [location.pathname]);

  const isAuthenticated =
    realIsAuthenticated || isPreviewInstructor || isPreviewManager;
  const role = isPreviewManager
    ? "manager"
    : isPreviewInstructor
      ? "instructor"
      : realRole;

  const [profileName, setProfileName] = useState(
    isPreviewManager
      ? "Manager Demo"
      : isPreviewInstructor
        ? "Instructor One"
        : "",
  );
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");

  const avatarFallback = useMemo(() => {
    const name = profileName.trim() || "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=ffffff`;
  }, [profileName]);

  const avatarPreview = profileAvatarUrl.trim() || avatarFallback;

  const loadNavbarProfile = useCallback(async () => {
    if (isPreviewInstructor) {
      setProfileName("Instructor One");
      return;
    }

    if (!token) {
      setProfileName("");
      setProfileAvatarUrl("");
      return;
    }

    try {
      const data = await getProfileRequest(token);
      setProfileName(normalizeFromApi(data.name));
      setProfileAvatarUrl(normalizeFromApi(data.avatar_url));
    } catch {
      setProfileName("");
      setProfileAvatarUrl("");
    }
  }, [token, isPreviewInstructor]);

  useEffect(() => {
    if (!isAuthenticated) {
      setProfileName("");
      setProfileAvatarUrl("");
      return;
    }

    void loadNavbarProfile();
  }, [isAuthenticated, loadNavbarProfile]);

  useEffect(() => {
    const handleProfileUpdated = () => {
      void loadNavbarProfile();
    };

    window.addEventListener("profile-updated", handleProfileUpdated);

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdated);
    };
  }, [loadNavbarProfile]);

  const handleLogout = () => {
    sessionStorage.removeItem("instructor_preview");
    sessionStorage.removeItem("manager_preview");
    setIsPreviewInstructor(false);
    setIsPreviewManager(false);
    navigate("/");
    setTimeout(() => {
      logout();
      toast.success("Successfully logged out!");
    }, 100);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-tr from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
              F
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-violet-600 to-indigo-600">
              FitFlow
            </span>
            {isPreviewInstructor && (
              <Badge className="bg-indigo-100 text-indigo-700 hidden sm:inline-flex ml-2">
                Instructor Demo
              </Badge>
            )}
            {isPreviewManager && (
              <Badge className="bg-emerald-100 text-emerald-700 hidden sm:inline-flex ml-2">
                Manager Demo
              </Badge>
            )}
          </Link>
          <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-xl">
            <NavLink
              to="/courses"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`
              }
            >
              Browse
            </NavLink>
            {role === "instructor" ? (
              <NavLink
                to="/instructor/dashboard"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`
                }
              >
                Dashboard
              </NavLink>
            ) : role === "manager" || role === "supermanager" ? (
              <NavLink
                to="/manager/dashboard"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`
                }
              >
                Dashboard
              </NavLink>
            ) : (
              <NavLink
                to="/my-schedule"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`
                }
              >
                My Schedule
              </NavLink>
            )}
          </div>

          <div className="flex items-center gap-4">
            {!isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] uppercase tracking-widest font-black"
                onClick={() => {
                  sessionStorage.setItem("manager_preview", "true");
                  window.location.reload();
                }}
              >
                Dev: Manager View
              </Button>
            )}
            {isAuthenticated ? (
              <>
                <NavLink
                  to={
                    role === "instructor" ? "/instructor/profile" : "/profile"
                  }
                  className={({ isActive }) =>
                    `relative w-10 h-10 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                      isActive
                        ? "border-indigo-600 ring-2 ring-indigo-100"
                        : "border-slate-200 hover:border-indigo-400"
                    }`
                  }
                >
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    onError={(event) => {
                      event.currentTarget.src = avatarFallback;
                    }}
                    className="w-full h-full object-cover"
                  />
                </NavLink>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="hidden sm:flex"
                >
                  <Icons.Logout /> Logout
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary">Register</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
