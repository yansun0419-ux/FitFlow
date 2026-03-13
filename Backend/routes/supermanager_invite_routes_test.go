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
	"gorm.io/gorm"
)

func setupInviteRouteTestDB(t *testing.T) {
	t.Helper()

	gin.SetMode(gin.TestMode)

	dsn := fmt.Sprintf("file:invite_route_test_%d?mode=memory&cache=shared", time.Now().UnixNano())
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

func seedSuperManagerUser(t *testing.T) model.User {
	t.Helper()

	// seed roles used by auth/invite
	if err := db.DB.Create(&model.Role{ID: 2, RoleName: "SuperManager"}).Error; err != nil {
		t.Fatalf("failed to seed role supermanager: %v", err)
	}

	u := model.User{
		Name:     "Super",
		Email:    fmt.Sprintf("super-%d@example.com", time.Now().UnixNano()),
		Password: "x",
		RoleID:   2,
	}
	if err := db.DB.Create(&u).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	return u
}

func TestSuperManagerCanCreateInviteCode(t *testing.T) {
	setupInviteRouteTestDB(t)

	super := seedSuperManagerUser(t)
	r := routes.SetupRouter()

	payload := map[string]any{
		"invitee_email": "new.manager@example.com",
		"expire_hours":  24,
	}
	b, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/auth/manager/invite-codes", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+makeToken(t, super.ID, 2)) // role_id=2 supermanager

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d, body=%s", w.Code, w.Body.String())
	}

	// verify row created in DB
	var count int64
	if err := db.DB.Model(&model.ManagerInviteCode{}).Count(&count).Error; err != nil {
		t.Fatalf("failed to count invites: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected 1 invite code row, got %d", count)
	}
}

func TestManagerCannotCreateInviteCode(t *testing.T) {
	setupInviteRouteTestDB(t)

	// seed manager role just for completeness
	if err := db.DB.Create(&model.Role{ID: 3, RoleName: "Manager"}).Error; err != nil {
		t.Fatalf("failed to seed role manager: %v", err)
	}

	r := routes.SetupRouter()

	payload := map[string]any{
		"invitee_email": "new.manager@example.com",
		"expire_hours":  24,
	}
	b, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/auth/manager/invite-codes", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+makeToken(t, 12345, 3)) // role_id=3 manager (should fail)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d, body=%s", w.Code, w.Body.String())
	}
}