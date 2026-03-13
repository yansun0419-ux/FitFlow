package routes_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"my-course-backend/db"
	"my-course-backend/model"
	"my-course-backend/routes"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

func setupManagerRouteTestDB(t *testing.T) {
	t.Helper()

	gin.SetMode(gin.TestMode)

	dsn := fmt.Sprintf("file:manager_route_test_%d?mode=memory&cache=shared", time.Now().UnixNano())
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
		&model.Enrollment{},
		&model.UserDailyActivity{},
		&model.ManagerInviteCode{},
	); err != nil {
		t.Fatalf("failed to migrate test database: %v", err)
	}

	db.DB = testDB
}

func seedRole(t *testing.T, id uint, name string) {
	t.Helper()
	if err := db.DB.Create(&model.Role{ID: id, RoleName: name}).Error; err != nil {
		t.Fatalf("failed to seed role: %v", err)
	}
}

func seedCourseForUpdate(t *testing.T) model.Course {
	t.Helper()

	startTime, _ := model.ParseTimeOnly("09:00")
	endTime, _ := model.ParseTimeOnly("10:00")

	c := model.Course{
		CourseName:  "Old Name",
		CourseCode:  "OLD-001",
		Description: "old desc",
		StartTime:   startTime,
		EndTime:     endTime,
		Capacity:    10,
		Duration:    60,
		Category:    "OldCat",
		Weekday:     "Monday",
	}
	if err := db.DB.Create(&c).Error; err != nil {
		t.Fatalf("failed to seed course: %v", err)
	}
	return c
}

// IMPORTANT: 你的 service/auth_service.go 里 jwtSecret 是硬编码的 []byte("my_super_secret_key_2026")。
// 这里为了让 role 校验通过，需要生成同样 secret 的 token。
var jwtSecretForTests = []byte("my_super_secret_key_2026")

func makeToken(t *testing.T, userID uint, roleID uint) string {
	t.Helper()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":      userID,
		"email":   "test@example.com",
		"role_id": roleID,
		"exp":     time.Now().Add(2 * time.Hour).Unix(),
	})

	s, err := token.SignedString(jwtSecretForTests)
	if err != nil {
		t.Fatalf("failed to sign token: %v", err)
	}
	return s
}

func TestManagerCanUpdateClass(t *testing.T) {
	setupManagerRouteTestDB(t)

	// seed roles: 3=Manager
	seedRole(t, 3, "Manager")

	// seed a course to update
	course := seedCourseForUpdate(t)

	r := routes.SetupRouter()

	body := map[string]any{
		"name":        "New Name",
		"course_code": "NEW-001",
		"description": "new desc",
		"start_time":  "08:00",
		"end_time":    "09:00",
		"capacity":    15,
		"duration":    45,
		"category":    "NewCat",
		"weekday":     "Tuesday",
	}
	b, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/classes/%d", course.ID), bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+makeToken(t, 999, 3)) // role_id=3 manager

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", w.Code, w.Body.String())
	}

	// verify DB updated
	var updated model.Course
	if err := db.DB.First(&updated, course.ID).Error; err != nil {
		t.Fatalf("failed to fetch updated course: %v", err)
	}
	if updated.CourseName != "New Name" || updated.CourseCode != "NEW-001" || updated.Capacity != 15 {
		t.Fatalf("course not updated as expected: %+v", updated)
	}
}

func TestStudentCannotUpdateClass(t *testing.T) {
	setupManagerRouteTestDB(t)

	// seed roles: 1=Student
	seedRole(t, 1, "Student")

	course := seedCourseForUpdate(t)
	r := routes.SetupRouter()

	body := map[string]any{
		"name":        "Should Fail",
		"course_code": "FAIL-001",
		"description": "x",
		"start_time":  "08:00",
		"end_time":    "09:00",
		"capacity":    15,
		"duration":    45,
		"category":    "NewCat",
		"weekday":     "Tuesday",
	}
	b, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/classes/%d", course.ID), bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+makeToken(t, 1000, 1)) // role_id=1 student

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d, body=%s", w.Code, w.Body.String())
	}
}