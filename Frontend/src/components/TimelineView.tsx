import { useMemo, useRef, useEffect } from "react";
import { Icons } from "../lib/icons";
import type { CourseCardItem } from "./CourseDetailsModal";

interface TimelineViewProps {
  courses: CourseCardItem[];
  onEventClick: (course: CourseCardItem) => void;
  enrolledCourseIds: number[];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // 5 AM to 11 PM

const COLOR_STYLES = [
  { bg: "#f5f3ff", border: "#6366f1", text: "#4338ca" }, // Indigo
  { bg: "#fff1f2", border: "#f43f5e", text: "#9f1239" }, // Rose
  { bg: "#ecfdf5", border: "#10b981", text: "#065f46" }, // Emerald
  { bg: "#fffbeb", border: "#f59e0b", text: "#92400e" }, // Amber
  { bg: "#f0f9ff", border: "#0ea5e9", text: "#075985" }, // Sky
];

const HOUR_WIDTH = 200; // Fixed width for each hour bucket
const SLOT_HEIGHT = 110; // Fixed height for each class card in the stack

const timeToMinutes = (time: string) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
};

const TimelineView = ({
  courses,
  onEventClick,
  enrolledCourseIds,
}: TimelineViewProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

  // Sync horizontal scrolling between header and body
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Set initial scroll to 8 AM
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = (8 - 5) * HOUR_WIDTH - 40;
    }
  }, []);

  const dayEvents = useMemo(() => {
    const days: Record<string, { slots: Record<number, CourseCardItem[]>; count: number; maxInHour: number }> = {};
    WEEKDAYS.forEach((day) => {
      const eventsInDay = courses.filter((c) => c.day === day);
      const slots: Record<number, CourseCardItem[]> = {};
      HOURS.forEach(h => slots[h] = []);
      
      let maxInHour = 1;
      eventsInDay.forEach(event => {
        const startMin = timeToMinutes(event.startTimeRaw || "00:00");
        const hour = Math.floor(startMin / 60);
        if (slots[hour]) {
          slots[hour].push(event);
          if (slots[hour].length > maxInHour) maxInHour = slots[hour].length;
        }
      });

      days[day] = { slots, count: eventsInDay.length, maxInHour };
    });
    return days;
  }, [courses]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm animate-in fade-in duration-500">
      {/* Time Header */}
      <div className="flex border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="w-28 shrink-0 border-r border-slate-200 p-4 flex flex-col justify-center bg-white z-40">
          <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Schedule</span>
          <span className="text-xs font-black text-slate-900">Weekly View</span>
        </div>
        <div 
          ref={headerScrollRef}
          className="flex-1 overflow-hidden flex pointer-events-none bg-slate-50/30"
        >
          {HOURS.map((hour) => (
            <div 
              key={hour} 
              className="shrink-0 border-r border-slate-200 p-3 text-[10px] font-bold text-slate-500 flex items-center justify-center"
              style={{ width: HOUR_WIDTH }}
            >
              <div className="bg-white px-4 py-1.5 rounded-xl shadow-xs border border-slate-200 text-slate-700 font-black">
                {hour % 12 === 0 ? 12 : hour % 12}:00 {hour >= 12 ? "PM" : "AM"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Days Body */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto max-h-[750px] relative scroll-smooth bg-white"
      >
        {WEEKDAYS.map((day) => {
          const { slots, maxInHour } = dayEvents[day];
          const height = maxInHour * SLOT_HEIGHT;

          return (
            <div key={day} className="flex border-b border-slate-200 last:border-0 group min-w-max relative">
              {/* Day Label - Sticky column */}
              <div 
                className="w-28 shrink-0 border-r border-slate-200 flex flex-col items-center justify-center bg-white group-hover:bg-slate-50 transition-colors sticky left-0 z-20"
                style={{ height }}
              >
                <span className="text-base font-black text-slate-800">{day}</span>
                <div className="mt-1 px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-bold text-slate-500 uppercase">
                  {dayEvents[day].count} {dayEvents[day].count === 1 ? 'Session' : 'Sessions'}
                </div>
              </div>

              {/* Grid Columns */}
              <div className="flex-1 flex relative" style={{ width: HOURS.length * HOUR_WIDTH, height }}>
                {HOURS.map((hour, idx) => (
                  <div 
                    key={hour} 
                    className={`shrink-0 border-r border-slate-200/80 relative flex flex-col p-1.5 gap-1.5 ${idx % 2 === 0 ? 'bg-slate-50/20' : 'bg-white'}`}
                    style={{ width: HOUR_WIDTH, height }}
                  >
                    {slots[hour].map((event) => {
                      const isEnrolled = enrolledCourseIds.includes(event.id);
                      const colorStyle = COLOR_STYLES[courses.findIndex(c => c.id === event.id) % COLOR_STYLES.length];
                      const spotsColor = event.spots === 0 ? "#ef4444" : event.spots < 5 ? "#f59e0b" : "#10b981";

                      return (
                        <div
                          key={event.id}
                          onClick={() => onEventClick(event)}
                          className="sx__event-card-wrapper shrink-0"
                          style={{
                            backgroundColor: colorStyle.bg,
                            borderLeft: `4px solid ${colorStyle.border}`,
                            height: SLOT_HEIGHT - 12,
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                            borderRadius: "8px",
                            cursor: "pointer",
                            overflow: "hidden",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          }}
                        >
                          <div className="sx__event-card-inner">
                            <div className="sx__event-card-header">
                              <span className="sx__event-card-emoji">{event.image}</span>
                              <span className="sx__event-card-title flex-1 min-w-0" style={{ color: colorStyle.text }}>
                                {event.title}
                              </span>
                              {isEnrolled && <span className="sx__event-enrolled-dot" />}
                            </div>

                            <div className="sx__event-card-instructor">
                              <Icons.User className="w-3.5 h-3.5" />
                              <span className="truncate">{event.instructor}</span>
                            </div>

                            <div className="sx__event-card-footer">
                              <div
                                className="sx__event-status-badge"
                                style={{ backgroundColor: `${spotsColor}20`, color: spotsColor }}
                              >
                                <div
                                  className="sx__event-status-dot"
                                  style={{ backgroundColor: spotsColor }}
                                />
                                <span>
                                  {event.spots === 0 ? "Full" : `${event.spots} spots left`}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-medium text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span>Enrolled Sessions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <span>Limited Availability</span>
          </div>
        </div>
        <p>Scroll horizontally to see full day schedule</p>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .sx__event-card-inner {
          display: flex;
          flex-direction: column;
          padding: 10px 12px;
          height: 100%;
          width: 100%;
          overflow: hidden;
          gap: 6px;
        }

        .sx__event-card-header {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 8px;
        }

        .sx__event-enrolled-dot {
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          background: #16a34a;
          flex-shrink: 0;
          margin-left: auto;
        }

        .sx__event-card-title {
          font-weight: 700 !important;
          font-size: 0.8rem !important;
          line-height: 1.2;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          white-space: normal !important;
          word-break: break-word;
          flex: 1;
          min-width: 0;
        }

        .sx__event-card-emoji {
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .sx__event-card-instructor {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem !important;
          font-weight: 500 !important;
          color: #64748b;
        }

        .sx__event-card-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }

        .sx__event-status-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px;
          border-radius: 9999px;
          font-size: 0.65rem !important;
          font-weight: 600 !important;
        }

        .sx__event-status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }

        .sx__event-card-wrapper:hover {
          filter: brightness(0.98);
        }
      `}</style>
    </div>
  );
};

export default TimelineView;
