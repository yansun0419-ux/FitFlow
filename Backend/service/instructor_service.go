package service

import (
	"errors"
	"my-course-backend/dao"
	"my-course-backend/model"
)

// InstructorAddEnrollment enrolls a user into a course taught by the instructor.
// Instructors bypass the 25-hour enrollment window but still check ownership, duplicates, and capacity.
func InstructorAddEnrollment(instructorID, userID, courseID uint) error {
	course, err := dao.GetCourseByID(courseID)
	if err != nil {
		return errors.New("class not found")
	}
	if course.InstructorID != instructorID {
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
	return dao.ListCoursesByInstructor(instructorID)
}

func ListInstructorCourseEnrollments(instructorID uint, courseID uint) ([]model.Enrollment, error) {
	course, err := dao.GetCourseByID(courseID)
	if err != nil {
		return nil, errors.New("class not found")
	}
	if course.InstructorID != instructorID {
		return nil, errors.New("forbidden")
	}
	return dao.ListEnrollmentsByInstructorCourse(courseID)
}

func UpdateEnrollmentStatusByInstructor(instructorID, courseID, userID uint, status string) error {
	if status != "attended" && status != "missed" && status != "enrolled" {
		return errors.New("invalid status")
	}

	course, err := dao.GetCourseByID(courseID)
	if err != nil {
		return errors.New("class not found")
	}

	if course.InstructorID != instructorID {
		return errors.New("forbidden")
	}

	// ✅ 校验用户是否选过课
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