import { useState, useMemo, useEffect, useCallback } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Icons } from "../lib/icons";
import CalendarView from "../components/CalendarView";
import CourseDetailsModal, {
  type CourseCardItem,
} from "../components/CourseDetailsModal";
import {
  listClassesRequest,
  registerClassRequest,
  dropClassRequest,
  getUserEnrollmentsRequest,
  type BackendClass,
} from "../lib/api";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";

const getCourseEmoji = (category: string) => {
  const key = (category || "").toLowerCase();
  if (key.includes("yoga")) return "🧘‍♀️";
  if (key.includes("cardio") || key.includes("hiit")) return "🔥";
  if (key.includes("pilates") || key.includes("strength")) return "💪";
  if (key.includes("dance") || key.includes("zumba")) return "💃";
  return "🏋️";
};

const normalizeWeekday = (weekday: string) => {
  const day = (weekday || "").trim();
  return day.length <= 3 ? day : day.slice(0, 3);
};

const formatTime = (time: string) => {
  const [hourText = "0", minuteText = "00"] = (time || "").split(":");
  const hour24 = Number(hourText);
  if (!Number.isFinite(hour24)) {
    return "--:--";
  }

  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(hour12).padStart(2, "0")}:${minuteText.slice(0, 2)} ${suffix}`;
};

const mapClassToCard = (course: BackendClass): CourseCardItem => ({
  id: course.id,
  title: course.name,
  instructor: "TBD Coach",
  time: formatTime(course.start_time),
  day: normalizeWeekday(course.weekday),
  spots: course.spot,
  capacity: course.capacity,
  type: course.category || "General",
  image: getCourseEmoji(course.category),
});

const Browse = () => {
  const navigate = useNavigate();
  const { isAuthenticated, token, userId } = useAuthStore();
  const [activeView, setActiveView] = useState<"grid" | "calendar">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<CourseCardItem | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [courses, setCourses] = useState<CourseCardItem[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<number[]>([]);
  const [courseToDrop, setCourseToDrop] = useState<CourseCardItem | null>(null);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const data = await listClassesRequest(1);
      setCourses((data.classes || []).map(mapClassToCard));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load classes";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClasses();
  }, []);

  const loadEnrollments = useCallback(async () => {
    if (!isAuthenticated || !token || !userId) {
      setEnrolledCourseIds([]);
      return;
    }

    try {
      const data = await getUserEnrollmentsRequest(token, userId);
      setEnrolledCourseIds((data.courses || []).map((course) => course.id));
    } catch {
      setEnrolledCourseIds([]);
    }
  }, [isAuthenticated, token, userId]);

  useEffect(() => {
    void loadEnrollments();
  }, [loadEnrollments]);

  const handleCourseSelect = (course: CourseCardItem) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  const handleBookCourse = async (course: CourseCardItem) => {
    if (booking) {
      return;
    }

    if (!isAuthenticated || !token) {
      toast.error("Please login first to register classes.");
      navigate("/login");
      return;
    }

    if (enrolledCourseIds.includes(course.id)) {
      toast("You are already enrolled in this class.", { icon: "ℹ️" });
      return;
    }

    setBooking(true);
    try {
      await registerClassRequest(token, course.id);
      toast.success(
        course.spots === 0 ? "Added to waitlist." : "Booking successful!",
      );
      setIsModalOpen(false);
      await Promise.all([loadClasses(), loadEnrollments()]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to book class";
      toast.error(message);
    } finally {
      setBooking(false);
    }
  };

  const handleQuickActionOnCard = async (course: CourseCardItem) => {
    if (isEnrolledCourse(course.id)) {
      requestDropCourse(course);
      return;
    }

    await handleBookCourse(course);
  };

  const requestDropCourse = (course: CourseCardItem) => {
    setCourseToDrop(course);
  };

  const handleDropCourse = async () => {
    if (!courseToDrop || !token || dropping) {
      return;
    }

    setDropping(true);
    try {
      await dropClassRequest(token, courseToDrop.id);
      toast.success("Class dropped successfully.");
      setCourseToDrop(null);
      setIsModalOpen(false);
      await Promise.all([loadClasses(), loadEnrollments()]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to drop class";
      toast.error(message);
    } finally {
      setDropping(false);
    }
  };

  const filteredCourses = useMemo(() => {
    return courses.filter(
      (course) =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.type.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [courses, searchQuery]);

  const isEnrolledCourse = (courseId: number) =>
    enrolledCourseIds.includes(courseId);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Browse Classes
          </h2>
          <p className="text-slate-500 text-sm">
            Book your spot in our premium sessions.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-full border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-hidden"
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-full w-full sm:w-auto">
            <button
              onClick={() => setActiveView("grid")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeView === "grid"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icons.Grid className="w-3.5 h-3.5" />
              Cards
            </button>
            <button
              onClick={() => setActiveView("calendar")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeView === "calendar"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icons.Calendar className="w-3.5 h-3.5" />
              Calendar
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <Card className="p-8 text-center border-dashed border-2 bg-transparent text-slate-500">
          Loading classes...
        </Card>
      ) : activeView === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course) => (
              <Card
                key={course.id}
                className="p-0 overflow-hidden hover:-translate-y-1 transition-transform duration-300 cursor-pointer group"
                onClick={() => handleCourseSelect(course)}
              >
                <div className="h-32 bg-linear-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-6xl relative">
                  {course.image}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-indigo-600 shadow-sm">
                    {course.type}
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate min-w-0">
                      {course.title}
                    </h3>
                    {isEnrolledCourse(course.id) && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold shrink-0">
                        <Icons.Check /> Enrolled
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500 mt-2 mb-6">
                    <div className="flex items-center gap-1">
                      <Icons.User /> {course.instructor}
                    </div>
                    <div className="flex items-center gap-1">
                      <Icons.Clock /> {course.day}, {course.time}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    {course.spots === 0 ? (
                      <span className="text-amber-600 text-sm font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>{" "}
                        Waitlist Only
                      </span>
                    ) : (
                      <span
                        className={`text-sm font-semibold flex items-center gap-1 ${
                          course.spots < 5
                            ? "text-rose-500"
                            : "text-emerald-600"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            course.spots < 5 ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                        ></span>
                        {course.spots} spots left
                      </span>
                    )}
                    <Button
                      variant={
                        isEnrolledCourse(course.id)
                          ? "danger"
                          : course.spots === 0
                            ? "outline"
                            : "primary"
                      }
                      className="text-sm px-6"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handleQuickActionOnCard(course);
                      }}
                    >
                      {isEnrolledCourse(course.id)
                        ? "Drop"
                        : course.spots === 0
                          ? "Join Waitlist"
                          : "Book"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-4">
                <Icons.Search className="w-6 h-6" />
              </div>
              <p className="text-slate-500">
                No classes found matching "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="text-indigo-600 font-semibold text-sm mt-2 hover:underline"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      ) : (
        <CalendarView
          courses={filteredCourses}
          onEventClick={handleCourseSelect}
          enrolledCourseIds={enrolledCourseIds}
        />
      )}

      <CourseDetailsModal
        course={selectedCourse}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBook={handleBookCourse}
        onDrop={requestDropCourse}
        booking={booking}
        dropping={dropping}
        enrolled={selectedCourse ? isEnrolledCourse(selectedCourse.id) : false}
      />

      {courseToDrop && (
        <div className="fixed inset-0 z-120 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icons.Alert />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Cancel Registration?
            </h3>
            <p className="text-slate-500 text-sm mt-2 mb-6">
              Are you sure you want to drop this class? You will lose your spot
              to the next person on the waitlist.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setCourseToDrop(null)}>
                Keep Spot
              </Button>
              <Button variant="danger" onClick={handleDropCourse}>
                {dropping ? "Dropping..." : "Yes, Drop"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Browse;
