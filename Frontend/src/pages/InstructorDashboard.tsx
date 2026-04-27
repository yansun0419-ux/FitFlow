import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import { Icons } from "../lib/icons";
import BackgroundBlobs from "../components/ui/BackgroundBlobs";
import toast from "react-hot-toast";
import {
  addInstructorEnrollmentRequest,
  listInstructorCourseEnrollmentsRequest,
  listInstructorCoursesRequest,
  updateInstructorEnrollmentStatusRequest,
  type InstructorCourseSummary,
  type InstructorRosterItem,
} from "../lib/api";
import { useAuthStore } from "../store/authStore";

type LocalStudent = {
  id: number;
  name: string;
  email: string;
  status: "pending" | "present" | "absent";
};

type ClassData = {
  id: number;
  name: string;
  time: string;
  capacity: number;
  status: "upcoming" | "active" | "completed";
  students: LocalStudent[];
  enrolledCount: number;
};

const normalizeStatus = (status: string): "pending" | "present" | "absent" => {
  if (status === "attended") {
    return "present";
  }
  if (status === "missed") {
    return "absent";
  }
  return "pending";
};

const toBackendStatus = (status: "present" | "absent") =>
  status === "present" ? "attended" : "missed";

const inferClassStatus = (
  course: InstructorCourseSummary,
): "upcoming" | "active" | "completed" => {
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5);
  if (hhmm >= course.start_time.slice(0, 5) && hhmm < course.end_time.slice(0, 5)) {
    return "active";
  }
  if (hhmm >= course.end_time.slice(0, 5)) {
    return "completed";
  }
  return "upcoming";
};

const mapEnrollmentToStudent = (item: InstructorRosterItem): LocalStudent => ({
  id: item.user_id,
  name: item.user?.name || `User #${item.user_id}`,
  email: item.user?.email || "",
  status: normalizeStatus(item.status),
});

const normalizeWeekday = (weekday: string): string => {
  const short = weekday.trim().slice(0, 3).toLowerCase();
  if (short === "mon") return "Mon";
  if (short === "tue") return "Tue";
  if (short === "wed") return "Wed";
  if (short === "thu") return "Thu";
  if (short === "fri") return "Fri";
  if (short === "sat") return "Sat";
  if (short === "sun") return "Sun";
  return weekday;
};

const formatClock = (raw: string): string => {
  const [hourText = "", minuteText = ""] = raw.split(":");
  const hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return raw;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const InstructorDashboard = () => {
  const { token } = useAuthStore();
  const [courses, setCourses] = useState<InstructorCourseSummary[]>([]);
  const [rosters, setRosters] = useState<Record<number, InstructorRosterItem[]>>({});
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudentId, setNewStudentId] = useState("");

  const loadRoster = async (courseId: number) => {
    if (!token) {
      return;
    }

    setRosterLoading(true);
    try {
      const data = await listInstructorCourseEnrollmentsRequest(token, courseId);
      setRosters((prev) => ({
        ...prev,
        [courseId]: data.enrollments || [],
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load roster";
      toast.error(message);
    } finally {
      setRosterLoading(false);
    }
  };

  const loadAllRosters = useCallback(async (courseIds: number[]) => {
    if (!token || courseIds.length === 0) {
      return;
    }

    setRosterLoading(true);
    try {
      const results = await Promise.all(
        courseIds.map(async (courseId) => {
          const data = await listInstructorCourseEnrollmentsRequest(
            token,
            courseId,
          );
          return [courseId, data.enrollments || []] as const;
        }),
      );

      setRosters((prev) => {
        const next = { ...prev };
        for (const [courseId, enrollments] of results) {
          next[courseId] = enrollments;
        }
        return next;
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load roster";
      toast.error(message);
    } finally {
      setRosterLoading(false);
    }
  }, [token]);

  const loadCourses = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await listInstructorCoursesRequest(token);
      const nextCourses = data.courses || [];
      setCourses(nextCourses);
      if (!selectedClassId && nextCourses.length > 0) {
        setSelectedClassId(nextCourses[0].id);
      }
      await loadAllRosters(nextCourses.map((course) => course.id));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load courses";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token, selectedClassId, loadAllRosters]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const classes: ClassData[] = useMemo(() => {
    return courses.map((course) => {
      const students = (rosters[course.id] || []).map(mapEnrollmentToStudent);
      return {
        id: course.id,
        name: course.name,
        time: `${normalizeWeekday(course.weekday)}, ${formatClock(course.start_time)} - ${formatClock(course.end_time)}`,
        capacity: course.capacity,
        status: inferClassStatus(course),
        students,
        enrolledCount: students.length,
      };
    });
  }, [courses, rosters]);

  const selectedClass = classes.find((course) => course.id === selectedClassId) || null;

  const applyLocalStatus = (courseId: number, userId: number, nextStatus: "attended" | "missed") => {
    setRosters((prev) => {
      const target = prev[courseId] || [];
      return {
        ...prev,
        [courseId]: target.map((row) =>
          row.user_id === userId
            ? {
                ...row,
                status: nextStatus,
              }
            : row,
        ),
      };
    });
  };

  const toggleAttendance = async (
    studentId: number,
    status: "present" | "absent",
  ) => {
    if (!token || !selectedClassId) {
      return;
    }

    const backendStatus = toBackendStatus(status);
    try {
      await updateInstructorEnrollmentStatusRequest(
        token,
        selectedClassId,
        studentId,
        backendStatus,
      );
      applyLocalStatus(selectedClassId, studentId, backendStatus);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update attendance";
      toast.error(message);
    }
  };

  const markAllPresent = async () => {
    if (!token || !selectedClassId || !selectedClass) {
      return;
    }

    setSavingAttendance(true);
    try {
      const updates = selectedClass.students
        .filter((student) => student.status !== "present")
        .map((student) =>
          updateInstructorEnrollmentStatusRequest(
            token,
            selectedClassId,
            student.id,
            "attended",
          ),
        );

      await Promise.all(updates);
      await loadRoster(selectedClassId);
      toast.success("All students marked present.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to mark all present";
      toast.error(message);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleAddEnrollment = async () => {
    if (!token || !selectedClassId) {
      return;
    }

    const userId = Number(newStudentId);
    if (!Number.isInteger(userId) || userId <= 0) {
      toast.error("Please enter a valid user ID.");
      return;
    }

    try {
      await addInstructorEnrollmentRequest(token, selectedClassId, userId);
      setNewStudentId("");
      setIsAddModalOpen(false);
      await loadRoster(selectedClassId);
      toast.success("Student added to class successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add student";
      toast.error(message);
    }
  };

  const refreshSelectedRoster = async () => {
    if (!selectedClassId) {
      return;
    }

    await loadRoster(selectedClassId);
    toast.success("Roster refreshed.");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 relative">
      <BackgroundBlobs />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-4 space-y-4">
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2 mb-4">
              <Icons.Calendar className="w-5 h-5 text-indigo-500" />
              My Classes
            </h2>
            {loading ? (
              <Card className="p-6 text-center text-slate-500">Loading classes...</Card>
            ) : classes.length === 0 ? (
              <Card className="p-6 text-center text-slate-500">
                No classes assigned to this instructor.
              </Card>
            ) : (
              classes.map((cls) => (
                <Card
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`group relative overflow-hidden p-4 cursor-pointer transition-all border-2 ${
                    selectedClassId === cls.id
                      ? "border-indigo-500 ring-4 ring-indigo-50 shadow-md bg-indigo-50/30"
                      : "border-transparent hover:border-slate-200"
                  }`}
                >
                  <span
                    className={`absolute left-0 top-0 h-full w-1 transition-colors ${
                      selectedClassId === cls.id
                        ? "bg-indigo-500"
                        : "bg-transparent group-hover:bg-slate-200"
                    }`}
                  />
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800">{cls.name}</h3>
                    {cls.status === "active" && (
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </div>
                  <div className="space-y-1.5 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Icons.Clock className="w-4 h-4" />
                      {cls.time}
                    </div>
                    <div className="flex items-center gap-2">
                      <Icons.User className="w-4 h-4" />
                      {cls.enrolledCount} / {cls.capacity} Students
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge
                      className={
                        cls.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : cls.status === "completed"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-blue-100 text-blue-700"
                      }
                    >
                      {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
                    </Badge>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                        selectedClassId === cls.id
                          ? "border-indigo-200 bg-indigo-100 text-indigo-600 shadow-sm"
                          : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      <Icons.ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="xl:col-span-8">
            {selectedClass ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-1">
                        {selectedClass.name}
                      </h2>
                      <p className="text-slate-500 flex items-center gap-2">
                        <Icons.Clock className="w-4 h-4" />
                        {selectedClass.time} • Student Roster
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={markAllPresent}
                        disabled={savingAttendance || rosterLoading}
                        className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                      >
                        Mark All Present
                      </Button>
                      <Button
                        variant="primary"
                        className="bg-slate-900 text-white shadow-md shadow-slate-200 hover:bg-slate-800 hover:shadow-slate-300"
                        onClick={() => setIsAddModalOpen(true)}
                      >
                        <Icons.Plus className="w-4 h-4 mr-2" />
                        Add Enrollment
                      </Button>
                      <Button
                        className="bg-linear-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-200 hover:from-indigo-500 hover:to-cyan-500"
                        onClick={refreshSelectedRoster}
                        disabled={rosterLoading}
                      >
                        Refresh Roster
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-hidden border border-slate-100 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                          <th className="px-6 py-4">Student</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {rosterLoading ? (
                          <tr>
                            <td className="px-6 py-10 text-center text-slate-400" colSpan={3}>
                              Loading roster...
                            </td>
                          </tr>
                        ) : selectedClass.students.length === 0 ? (
                          <tr>
                            <td className="px-6 py-10 text-center text-slate-400" colSpan={3}>
                              No enrolled students in this class.
                            </td>
                          </tr>
                        ) : (
                          selectedClass.students.map((student) => (
                            <tr
                              key={student.id}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                    {(student.name || "?").charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-700">
                                      {student.name}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      {student.email || "No email"}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {student.status === "present" ? (
                                  <Badge className="bg-emerald-100 text-emerald-700">
                                    Present
                                  </Badge>
                                ) : student.status === "absent" ? (
                                  <Badge className="bg-rose-100 text-rose-700">
                                    No-show
                                  </Badge>
                                ) : (
                                  <Badge className="bg-slate-100 text-slate-500">
                                    Pending
                                  </Badge>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() =>
                                      void toggleAttendance(student.id, "present")
                                    }
                                    className={`p-2 rounded-lg transition-all ${
                                      student.status === "present"
                                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-100"
                                        : "bg-white text-slate-300 border border-slate-200 hover:border-emerald-500 hover:text-emerald-500"
                                    }`}
                                    title="Mark Present"
                                  >
                                    <Icons.Check />
                                  </button>
                                  <button
                                    onClick={() =>
                                      void toggleAttendance(student.id, "absent")
                                    }
                                    className={`p-2 rounded-lg transition-all ${
                                      student.status === "absent"
                                        ? "bg-rose-500 text-white shadow-md shadow-rose-100"
                                        : "bg-white text-slate-300 border border-slate-200 hover:border-rose-500 hover:text-rose-500"
                                    }`}
                                    title="Mark No-show"
                                  >
                                    <Icons.X className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Icons.Calendar className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-600 mb-2">
                  Select a Class
                </h3>
                <p className="max-w-xs mx-auto">
                  Choose a class from your schedule to view the student roster
                  and manage attendance.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <Icons.User className="w-8 h-8 text-slate-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              Add Student Enrollment
            </h2>
            <p className="text-slate-500">Adding to {selectedClass?.name}</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">
                Student User ID
              </label>
              <Input
                type="number"
                placeholder="e.g. 12"
                value={newStudentId}
                onChange={(e) => setNewStudentId(e.target.value)}
              />
            </div>

            <div className="pt-4 flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => void handleAddEnrollment()}
              >
                Add Student
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InstructorDashboard;
