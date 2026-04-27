import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InstructorProfile from "./InstructorProfile";

const { updateProfileRequestMock } = vi.hoisted(() => ({
  updateProfileRequestMock: vi.fn(async () => ({ message: "ok" })),
}));

vi.mock("../store/authStore", () => ({
  useAuthStore: () => ({ token: "token-123" }),
}));

vi.mock("../lib/api", () => ({
  getProfileRequest: vi.fn(async () => ({
    name: "Instructor One",
    email: "instructor1@fitflow.com",
    avatar_url: "",
    date_of_birth: "",
    gender: "",
    phone_number: "",
    address: "",
  })),
  updateProfileRequest: updateProfileRequestMock,
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

describe("InstructorProfile page", () => {
  it("updates profile through edit modal", async () => {
    render(<InstructorProfile />);

    await userEvent.click(await screen.findByRole("button", { name: "Edit Profile" }));

    const nameInput = screen.getByPlaceholderText("Name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated Instructor Name");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(updateProfileRequestMock).toHaveBeenCalled();
  });
});
