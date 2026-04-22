package service

import (
	"errors"
	"my-course-backend/dao"
	"my-course-backend/model"
	"strings"
)

// resolveInstructorName returns the instructor user's display name for authorization checks.
func resolveInstructorName(instructorID uint) (string, error) {
	user, err := dao.GetUserByID(instructorID)
	if err != nil {
		return "", errors.New("instructor not found")
	}
	return strings.TrimSpace(user.Name), nil
}

// courseBelongsToInstructor compares the course's instructor name to the authenticated instructor's name.
func courseBelongsToInstructor(course *model.Course, instructorName string) bool {
	return strings.TrimSpace(course.Instructor) != "" &&
		strings.EqualFold(strings.TrimSpace(course.Instructor), instructorName)
}

// InstructorAddEnrollment enrolls a user into a course taught by the instructor.
// Instructors bypass the 25-hour enrollment window but still check ownership, duplicates, and capacity.
func InstructorAddEnrollment(instructorID, userID, courseID uint) error {
	instructorName, err := resolveInstructorName(instructorID)
	if err != nil {
		return err
	}

	course, err := dao.GetCourseByID(courseID)
	if err != nil {
		return errors.New("class not found")
	}
	if !courseBelongsToInstructor(course, instructorName) {
		return errors.New("forbidden")
	}

	if _, err := dao.GetUserByID(userID); err != nil {
		return errors.New("user not found")
	}

	exists, err := dao.CheckEnrollmentExists(userID, courseID)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("enrollment already exists")
	}

	count, err := dao.CountEnrollmentsByClass(courseID)
	if err != nil {
		return err
	}
	if int(count) >= course.Capacity {
		return errors.New("class is full")
	}

	session, err := dao.GetNextScheduledSession(courseID)
	if err != nil {
		return errors.New("no upcoming session found for this class")
	}

	enrollment := model.Enrollment{
		UserID:    userID,
		CourseID:  courseID,
		SessionID: &session.ID,
		Status:    model.EnrollmentStatusEnrolled,
	}
	return dao.CreateEnrollment(&enrollment)
}

func ListInstructorCourses(instructorID uint) ([]model.Course, error) {
	instructorName, err := resolveInstructorName(instructorID)
	if err != nil {
		return nil, err
	}
	return dao.ListCoursesByInstructorName(instructorName)
}

func ListInstructorCourseEnrollments(instructorID uint, courseID uint) ([]model.Enrollment, error) {
	instructorName, err := resolveInstructorName(instructorID)
	if err != nil {
		return nil, err
	}
	if err := dao.SyncEndedEnrollmentsToAttended(); err != nil {
		return nil, err
	}

	course, err := dao.GetCourseByID(courseID)
	if err != nil {
		return nil, errors.New("class not found")
	}
	if !courseBelongsToInstructor(course, instructorName) {
		return nil, errors.New("forbidden")
	}
	return dao.ListEnrollmentsByInstructorCourse(courseID)
}

func UpdateEnrollmentStatusByInstructor(instructorID, courseID, userID uint, status string) error {
	if status != "attended" && status != "missed" && status != "enrolled" {
		return errors.New("invalid status")
	}

	instructorName, err := resolveInstructorName(instructorID)
	if err != nil {
		return err
	}

	course, err := dao.GetCourseByID(courseID)
	if err != nil {
		return errors.New("class not found")
	}

	if !courseBelongsToInstructor(course, instructorName) {
		return errors.New("forbidden")
	}

	// Verify user enrolled in this course
	if _, err := dao.GetEnrollment(userID, courseID); err != nil {
		return errors.New("enrollment not found")
	}

	ok, err := dao.UpdateEnrollmentStatus(userID, courseID, status)
	if err != nil {
		return err
	}
	if !ok {
		return errors.New("enrollment not found")
	}
	return nil
}
