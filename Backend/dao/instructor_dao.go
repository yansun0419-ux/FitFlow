package dao

import (
	"my-course-backend/db"
	"my-course-backend/model"
)

// ListCoursesByInstructorName returns all courses whose instructor column matches the given name (case-insensitive, trimmed).
func ListCoursesByInstructorName(name string) ([]model.Course, error) {
	var courses []model.Course
	if err := db.DB.
		Where("LOWER(TRIM(instructor)) = LOWER(TRIM(?))", name).
		Order("start_time ASC").
		Find(&courses).Error; err != nil {
		return nil, err
	}
	return courses, nil
}

func ListEnrollmentsByInstructorCourse(courseID uint) ([]model.Enrollment, error) {
	var enrollments []model.Enrollment
	if err := db.DB.Where("course_id = ?", courseID).
		Preload("User").
		Find(&enrollments).Error; err != nil {
		return nil, err
	}
	return enrollments, nil
}