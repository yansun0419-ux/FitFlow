import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InstructorDashboard from "./InstructorDashboard";

let roster = [
  {
    id: 1,
    user_id: 201,
    course_id: 2,
    status: "enrolled",
    enroll_time: "2026-04-27T00:00:00Z",
    user: { id: 201, name: "David Miller", email: "david@example.com" },
  },
  {
    id: 2,
    user_id: 202,
    course_id: 2,
    status: "enrolled",
    enroll_time: "2026-04-27T00:00:00Z",
    user: { id: 202, name: "Emma Wilson", email: "emma@example.com" },
  },
];

vi.mock("../store/authStore", () => ({
  useAuthStore: () => ({ token: "token-123" }),
}));

vi.mock("../lib/api", () => ({
  listInstructorCoursesRequest: vi.fn(async () => ({
    courses: [
      {
        id: 2,
        name: "Power Vinyasa",
        course_code: "YOG201",
        weekday: "Mon",
        start_time: "11:30",
        end_time: "12:30",
        capacity: 15,
        spot: 2,
        category: "Yoga",
      },
    ],
  })),
  listInstructorCourseEnrollmentsRequest: vi.fn(async () => ({
    enrollments: roster,
  })),
  updateInstructorEnrollmentStatusRequest: vi.fn(
    async (_token: string, _courseId: number, userId: number, status: string) => {
      roster = roster.map((item) =>
        item.user_id === userId ? { ...item, status } : item,
      );
      return { message: "ok" };
    },
  ),
  addInstructorEnrollmentRequest: vi.fn(
    async (_token: string, courseId: number, userId: number) => {
      roster = [
        ...roster,
        {
          id: Date.now(),
          user_id: userId,
          course_id: courseId,
          status: "enrolled",
          enroll_time: "2026-04-27T00:00:00Z",
          user: {
            id: userId,
            name: `User #${userId}`,
            email: "",
          },
        },
      ];
      return { message: "created" };
    },
  ),
}));

vi.mock("react-hot-toast", () => {
  const toastFn = vi.fn();
  return {
    default: Object.assign(toastFn, {
      success: vi.fn(),
      error: vi.fn(),
    }),
  };
});

describe("InstructorDashboard page", () => {
  beforeEach(() => {
    roster = [
      {
        id: 1,
        user_id: 201,
        course_id: 2,
        status: "enrolled",
        enroll_time: "2026-04-27T00:00:00Z",
        user: { id: 201, name: "David Miller", email: "david@example.com" },
      },
      {
        id: 2,
        user_id: 202,
        course_id: 2,
        status: "enrolled",
        enroll_time: "2026-04-27T00:00:00Z",
        user: { id: 202, name: "Emma Wilson", email: "emma@example.com" },
      },
    ];
  });

  it("marks all students present for the selected class", async () => {
    render(<InstructorDashboard />);

    await userEvent.click(await screen.findByRole("button", { name: "Mark All Present" }));

    await waitFor(() => {
      expect(screen.queryAllByText("Pending")).toHaveLength(0);
    });
    expect(screen.getAllByText("Present").length).toBeGreaterThanOrEqual(2);
  });

  it("adds a student enrollment by user id", async () => {
    render(<InstructorDashboard />);

    await userEvent.click(await screen.findByRole("button", { name: "Add Enrollment" }));

    await userEvent.type(screen.getByPlaceholderText("e.g. 12"), "888");
    await userEvent.click(screen.getByRole("button", { name: "Add Student" }));

    expect(await screen.findByText("User #888")).toBeInTheDocument();
  });
});
