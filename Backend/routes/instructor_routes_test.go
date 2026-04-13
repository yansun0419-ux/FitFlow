package routes_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"my-course-backend/db"
	"my-course-backend/model"
	"my-course-backend/routes"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupInstructorTestDB(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	dsn := fmt.Sprintf("file:instructor_test_%d?mode=memory&cache=shared", time.Now().UnixNano())
	testDB, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test database: %v", err)
	}

	if err := testDB.Exec("PRAGMA foreign_keys = ON;").Error; err != nil {
		t.Fatalf("failed to enable foreign keys: %v", err)
	}

	if err := testDB.AutoMigrate(
		&model.Role{},
		&model.User{},
		&model.UserInfo{},
		&model.Course{},
		&model.ClassSession{},
		&model.Enrollment{},
		&model.UserDailyActivity{},
	); err != nil {
		t.Fatalf("failed to migrate test database: %v", err)
	}

	db.DB = testDB
}

func seedInstructorUser(t *testing.T) (model.User, string) {
	t.Helper()
	// role_id=4 is Instructor
	if err := db.DB.Create(&model.Role{ID: 4, RoleName: "Instructor"}).Error; err != nil {
		t.Fatalf("failed to seed role: %v", err)
	}
	user := model.User{
		Name:     "Test Instructor",
		Email:    fmt.Sprintf("instructor-%d@example.com", time.Now().UnixNano()),
		Password: "notused",
		RoleID:   4,
	}
	if err := db.DB.Create(&user).Error; err != nil {
		t.Fatalf("failed to seed instructor user: %v", err)
	}
	token := makeToken(t, user.ID, 4)
	return user, token
}

func seedTestUser(t *testing.T) model.User {
	t.Helper()
	db.DB.FirstOrCreate(&model.Role{ID: 1, RoleName: "Student"}, "id = ?", 1)
	user := model.User{
		Name:     "Test User",
		Email:    fmt.Sprintf("user-%d@example.com", time.Now().UnixNano()),
		Password: "notused",
		RoleID:   1,
	}
	if err := db.DB.Create(&user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	return user
}

func seedCourseWithInstructor(t *testing.T, instructorID uint, name string, capacity int) model.Course {
	t.Helper()
	startTime, _ := model.ParseTimeOnly("09:00")
	endTime, _ := model.ParseTimeOnly("10:00")

	course := model.Course{
		CourseName:   name,
		CourseCode:    fmt.Sprintf("INS-%d", time.Now().UnixNano()),
		Capacity:     capacity,
		Category:     "Fitness",
		StartTime:    startTime,
		EndTime:      endTime,
		Weekday:      "Monday",
		InstructorID: instructorID,
		Duration:     60,
	}
	if err := db.DB.Create(&course).Error; err != nil {
		t.Fatalf("failed to seed course: %v", err)
	}

	// Create a scheduled session
	sessionDate := time.Now().AddDate(0, 0, 1)
	session := model.ClassSession{
		CourseID:    course.ID,
		SessionDate: sessionDate.Format("2006-01-02"),
		StartAt:     time.Date(sessionDate.Year(), sessionDate.Month(), sessionDate.Day(), 9, 0, 0, 0, time.UTC),
		EndAt:       time.Date(sessionDate.Year(), sessionDate.Month(), sessionDate.Day(), 10, 0, 0, 0, time.UTC),
		Status:      "scheduled",
		Capacity:    capacity,
	}
	if err := db.DB.Create(&session).Error; err != nil {
		t.Fatalf("failed to seed class session: %v", err)
	}

	return course
}

func seedEnrollmentWithSession(t *testing.T, userID, courseID uint, status string) model.Enrollment {
	t.Helper()
	var session model.ClassSession
	if err := db.DB.Where("course_id = ? AND status = ?", courseID, "scheduled").
		Order("session_date ASC").First(&session).Error; err != nil {
		t.Fatalf("failed to find scheduled session: %v", err)
	}

	enrollment := model.Enrollment{
		UserID:     userID,
		CourseID:   courseID,
		SessionID:  &session.ID,
		Status:     status,
		EnrollTime: time.Now(),
	}
	if err := db.DB.Create(&enrollment).Error; err != nil {
		t.Fatalf("failed to seed enrollment: %v", err)
	}
	return enrollment
}

// ─── GET /instructor/courses ─────────────────────────────────────

func TestInstructorGetCourseList_OK(t *testing.T) {
	setupInstructorTestDB(t)
	instructor, token := seedInstructorUser(t)
	seedCourseWithInstructor(t, instructor.ID, "Yoga 101", 20)
	seedCourseWithInstructor(t, instructor.ID, "Pilates", 15)
	router := routes.SetupRouter()

	rec := performJSONRequest(t, router, http.MethodGet, "/instructor/courses", token, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp struct {
		Courses []model.Course `json:"courses"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}
	if len(resp.Courses) != 2 {
		t.Fatalf("expected 2 courses, got %d", len(resp.Courses))
	}
}

func TestInstructorGetCourseList_Empty(t *testing.T) {
	setupInstructorTestDB(t)
	_, token := seedInstructorUser(t)
	router := routes.SetupRouter()

	rec := performJSONRequest(t, router, http.MethodGet, "/instructor/courses", token, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp struct {
		Courses []model.Course `json:"courses"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}
	if len(resp.Courses) != 0 {
		t.Fatalf("expected 0 courses, got %d", len(resp.Courses))
	}
}

func TestInstructorGetCourseList_Forbidden_NonInstructor(t *testing.T) {
	setupInstructorTestDB(t)
	// Seed non-instructor role for forbidden test
	db.DB.Create(&model.Role{ID: 1, RoleName: "Student"})
	userToken := makeToken(t, 999, 1) // role_id=1, not an instructor
	router := routes.SetupRouter()

	rec := performJSONRequest(t, router, http.MethodGet, "/instructor/courses", userToken, nil)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", rec.Code, rec.Body.String())
	}
}

// ─── GET /instructor/courses/:id/enrollments ─────────────────────

func TestInstructorGetCourseEnrollments_OK(t *testing.T) {
	setupInstructorTestDB(t)
	instructor, token := seedInstructorUser(t)
	course := seedCourseWithInstructor(t, instructor.ID, "HIIT", 20)
	user := seedTestUser(t)
	seedEnrollmentWithSession(t, user.ID, course.ID, model.EnrollmentStatusEnrolled)
	router := routes.SetupRouter()

	path := fmt.Sprintf("/instructor/courses/%d/enrollments", course.ID)
	rec := performJSONRequest(t, router, http.MethodGet, path, token, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp struct {
		Enrollments []model.Enrollment `json:"enrollments"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}
	if len(resp.Enrollments) != 1 {
		t.Fatalf("expected 1 enrollment, got %d", len(resp.Enrollments))
	}
	if resp.Enrollments[0].UserID != user.ID {
		t.Fatalf("expected user_id %d, got %d", user.ID, resp.Enrollments[0].UserID)
	}
}

func TestInstructorGetCourseEnrollments_Forbidden_NotOwner(t *testing.T) {
	setupInstructorTestDB(t)
	instructor, _ := seedInstructorUser(t)
	course := seedCourseWithInstructor(t, instructor.ID, "Spin", 10)

	// Create another instructor
	otherInstructor := model.User{
		Name:     "Other Instructor",
		Email:    fmt.Sprintf("other-instructor-%d@example.com", time.Now().UnixNano()),
		Password: "notused",
		RoleID:   4,
	}
	db.DB.Create(&otherInstructor)
	otherToken := makeToken(t, otherInstructor.ID, 4)

	router := routes.SetupRouter()
	path := fmt.Sprintf("/instructor/courses/%d/enrollments", course.ID)
	rec := performJSONRequest(t, router, http.MethodGet, path, otherToken, nil)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestInstructorGetCourseEnrollments_NotFound(t *testing.T) {
	setupInstructorTestDB(t)
	_, token := seedInstructorUser(t)
	router := routes.SetupRouter()

	rec := performJSONRequest(t, router, http.MethodGet, "/instructor/courses/9999/enrollments", token, nil)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
}

// ─── PATCH /instructor/courses/:id/enrollments ───────────────────

func TestInstructorUpdateEnrollmentStatus_Attended(t *testing.T) {
	setupInstructorTestDB(t)
	instructor, token := seedInstructorUser(t)
	course := seedCourseWithInstructor(t, instructor.ID, "Boxing", 20)
	user := seedTestUser(t)
	seedEnrollmentWithSession(t, user.ID, course.ID, model.EnrollmentStatusEnrolled)
	router := routes.SetupRouter()

	path := fmt.Sprintf("/instructor/courses/%d/enrollments", course.ID)
	body := map[string]interface{}{
		"user_id": user.ID,
		"status":  "attended",
	}
	rec := performJSONRequest(t, router, http.MethodPatch, path, token, body)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	// Verify status changed in DB
	var enrollment model.Enrollment
	db.DB.Where("user_id = ? AND course_id = ?", user.ID, course.ID).First(&enrollment)
	if enrollment.Status != "attended" {
		t.Fatalf("expected status 'attended', got '%s'", enrollment.Status)
	}
}

func TestInstructorUpdateEnrollmentStatus_Missed(t *testing.T) {
	setupInstructorTestDB(t)
	instructor, token := seedInstructorUser(t)
	course := seedCourseWithInstructor(t, instructor.ID, "Cycling", 20)
	user := seedTestUser(t)
	seedEnrollmentWithSession(t, user.ID, course.ID, model.EnrollmentStatusEnrolled)
	router := routes.SetupRouter()

	path := fmt.Sprintf("/instructor/courses/%d/enrollments", course.ID)
	body := map[string]interface{}{
		"user_id": user.ID,
		"status":  "missed",
	}
	rec := performJSONRequest(t, router, http.MethodPatch, path, token, body)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var enrollment model.Enrollment
	db.DB.Where("user_id = ? AND course_id = ?", user.ID, course.ID).First(&enrollment)
	if enrollment.Status != "missed" {
		t.Fatalf("expected status 'missed', got '%s'", enrollment.Status)
	}
}

func TestInstructorUpdateEnrollmentStatus_InvalidStatus(t *testing.T) {
	setupInstructorTestDB(t)
	instructor, token := seedInstructorUser(t)
	course := seedCourseWithInstructor(t, instructor.ID, "Dance", 20)
	user := seedTestUser(t)
	seedEnrollmentWithSession(t, user.ID, course.ID, model.EnrollmentStatusEnrolled)
	router := routes.SetupRouter()

	path := fmt.Sprintf("/instructor/courses/%d/enrollments", course.ID)
	body := map[string]interface{}{
		"user_id": user.ID,
		"status":  "invalid_status",
	}
	rec := performJSONRequest(t, router, http.MethodPatch, path, token, body)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestInstructorUpdateEnrollmentStatus_Forbidden_NotOwner(t *testing.T) {
	setupInstructorTestDB(t)
	instructor, _ := seedInstructorUser(t)
	course := seedCourseWithInstructor(t, instructor.ID, "Zumba", 20)
	user := seedTestUser(t)
	seedEnrollmentWithSession(t, user.ID, course.ID, model.EnrollmentStatusEnrolled)

	otherInstructor := model.User{
		Name:     "Other Instructor",
		Email:    fmt.Sprintf("other-%d@example.com", time.Now().UnixNano()),
		Password: "notused",
		RoleID:   4,
	}
	db.DB.Create(&otherInstructor)
	otherToken := makeToken(t, otherInstructor.ID, 4)

	router := routes.SetupRouter()
	path := fmt.Sprintf("/instructor/courses/%d/enrollments", course.ID)
	body := map[string]interface{}{
		"user_id": user.ID,
		"status":  "attended",
	}
	rec := performJSONRequest(t, router, http.MethodPatch, path, otherToken, body)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestInstructorUpdateEnrollmentStatus_EnrollmentNotFound(t *testing.T) {
	setupInstructorTestDB(t)
	instructor, token := seedInstructorUser(t)
	course := seedCourseWithInstructor(t, instructor.ID, "Stretch", 20)
	router := routes.SetupRouter()

	path := fmt.Sprintf("/instructor/courses/%d/enrollments", course.ID)
	body := map[string]interface{}{
		"user_id": 9999,
		"status":  "attended",
	}
	rec := performJSONRequest(t, router, http.MethodPatch, path, token, body)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
}
