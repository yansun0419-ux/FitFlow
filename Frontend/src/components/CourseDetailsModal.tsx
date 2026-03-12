import React from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import { Icons } from "../lib/icons";
import { COURSES } from "../lib/constants";

type Course = (typeof COURSES)[0];

interface CourseDetailsModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
}

const CourseDetailsModal = ({ course, isOpen, onClose }: CourseDetailsModalProps) => {
  if (!course) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="h-48 bg-linear-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-8xl relative">
        {course.image}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-indigo-600 shadow-sm">
          {course.type}
        </div>
      </div>
      <div className="p-8">
        <h3 className="text-2xl font-bold text-slate-900 mb-2">
          {course.title}
        </h3>
        
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 text-slate-600">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <Icons.User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Instructor</p>
              <p className="font-semibold">{course.instructor}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-slate-600">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <Icons.Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Schedule</p>
              <p className="font-semibold">{course.day}, {course.time}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-600">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <Icons.Info className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Availability</p>
              <p className="font-semibold">{course.capacity - course.spots} / {course.capacity} spots filled</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              {course.spots === 0 ? (
                <span className="text-amber-600 text-sm font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>{" "}
                  Waitlist Only
                </span>
              ) : (
                <span
                  className={`text-sm font-bold flex items-center gap-2 ${
                    course.spots < 5 ? "text-rose-500" : "text-emerald-600"
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      course.spots < 5 ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                  ></span>
                  {course.spots} spots remaining
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 italic">Limited availability</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <Button
                variant="secondary"
                onClick={onClose}
                className="w-full"
              >
                Cancel
              </Button>
              <Button
                variant={course.spots === 0 ? "outline" : "primary"}
                className="w-full shadow-lg shadow-indigo-200"
                onClick={() => {
                  alert(course.spots === 0 ? "Added to waitlist!" : "Booking successful!");
                  onClose();
                }}
              >
                {course.spots === 0 ? "Join Waitlist" : "Book Now"}
              </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CourseDetailsModal;
