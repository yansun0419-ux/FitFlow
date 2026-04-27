import { useState, useEffect, useMemo } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import { Icons } from "../lib/icons";
import BackgroundBlobs from "../components/ui/BackgroundBlobs";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { 
  listStudentsRequest, 
  getManagerUserEnrollmentsRequest,
  type UserListItem, 
  type BackendClass,
  type ManagerEnrollmentItem,
} from "../lib/api";

const ManagerDashboard = () => {
  const { token } = useAuthStore();
  const [students, setStudents] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // History Modal State
  const [selectedStudent, setSelectedStudent] = useState<UserListItem | null>(null);
  const [history, setHistory] = useState<ManagerEnrollmentItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadStudents = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const data = await listStudentsRequest(token);
      setStudents((data.users || []).filter((user) => user.role === "student"));
    } catch (error) {
      console.error("Failed to load students", error);
      toast.error("Failed to load student list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStudents();
  }, [token]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const viewHistory = async (student: UserListItem) => {
    setSelectedStudent(student);
    setHistoryLoading(true);
    setHistory([]);
    
    try {
      if (!token) {
        toast.error("Please log in again.");
        return;
      }

      const data = await getManagerUserEnrollmentsRequest(token, student.id);
      setHistory(data.enrollments || []);
    } catch (error) {
      console.error("Failed to load history", error);
      toast.error("Failed to load class history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 relative">
      <BackgroundBlobs />
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-800">Student Directory</h1>
              <Badge className="bg-indigo-100 text-indigo-700">Manager View</Badge>
            </div>
            <p className="text-slate-500">
              Manage members and view their class attendance history.
            </p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm"
            />
          </div>
        </header>

        <Card className="overflow-hidden border-slate-200/60 shadow-xl shadow-slate-200/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Student</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Email</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                      Loading students...
                    </td>
                  </tr>
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-linear-to-tr from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-600 font-bold text-sm shadow-sm border border-white">
                            {student.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-700">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{student.email}</td>
                      <td className="px-6 py-4">
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase">Active</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          onClick={() => viewHistory(student)}
                          className="text-indigo-600 hover:bg-indigo-50 font-bold text-xs rounded-xl px-4 py-2"
                        >
                          <Icons.Clock className="w-3.5 h-3.5 mr-2" />
                          View Classes
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                      No students found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* History Modal */}
      <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} panelClassName="max-w-2xl">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-200">
              {selectedStudent?.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">{selectedStudent?.name}</h2>
              <p className="text-slate-500 text-sm font-medium">{selectedStudent?.email}</p>
            </div>
          </div>

          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-100 pb-2">Enrollment History</h3>
          
          <div className="space-y-3 max-h-100 overflow-y-auto pr-2 custom-scrollbar">
            {historyLoading ? (
              <div className="py-12 text-center text-slate-400 italic">Loading history...</div>
            ) : history.length > 0 ? (
              history.map((enrollment) => {
                const course: BackendClass = enrollment.course;
                return (
                <div key={enrollment.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xl shadow-xs">
                      🏃
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{course.name}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        {course.weekday} • {course.start_time} - {course.end_time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-white text-indigo-600 border border-slate-200 font-bold px-3 py-1">
                      {course.category || "General"}
                    </Badge>
                    <Badge
                      className={
                        enrollment.status === "attended"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : enrollment.status === "missed"
                            ? "bg-rose-50 text-rose-700 border border-rose-100"
                            : "bg-slate-100 text-slate-600"
                      }
                    >
                      {enrollment.status}
                    </Badge>
                  </div>
                </div>
                );
              })
            ) : (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 italic">
                No classes attended yet.
              </div>
            )}
          </div>

          <div className="mt-8">
            <Button variant="secondary" className="w-full py-3 rounded-2xl font-bold uppercase tracking-widest text-xs" onClick={() => setSelectedStudent(null)}>
              Close History
            </Button>
          </div>
        </div>
      </Modal>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default ManagerDashboard;
