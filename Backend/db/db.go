package db

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	var err error
	dbPath := ResolvedDBPath()
	// connect SQLite
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	DB.Exec("PRAGMA foreign_keys = ON;")
	migrateUserInfoTable()
	migrateEnrollmentTable()
	migrateCourseInstructorColumn()
	ensureUserDailyActivityTable()
	ensureClassSessionTable()
	migrateClassSessions()
	migrateEnrollmentSessionIDs()
	ensureEnrollmentUniqueConstraint()
	// Normalize TIME values to HH:MM:SS for consistent scanning.
	if DB.Migrator().HasTable("Course") {
		DB.Exec("UPDATE Course SET start_time = start_time || ':00' WHERE start_time IS NOT NULL AND length(start_time) = 5;")
		DB.Exec("UPDATE Course SET end_time = end_time || ':00' WHERE end_time IS NOT NULL AND length(end_time) = 5;")
	}

	log.Printf("Database connected and foreign keys enabled. Using %s", dbPath)
}

func ResolvedDBPath() string {
	if configured := strings.TrimSpace(os.Getenv("FITFLOW_DB_PATH")); configured != "" {
		return absPathOrFallback(configured)
	}

	if backendRoot := backendRootFromSource(); backendRoot != "" {
		return filepath.Join(backendRoot, "homework.db")
	}

	return resolveDBPathFromWorkingDirectory()
}

func backendRootFromSource() string {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		return ""
	}

	backendRoot := filepath.Clean(filepath.Join(filepath.Dir(file), ".."))
	return absPathOrFallback(backendRoot)
}

func resolveDBPathFromWorkingDirectory() string {
	wd, err := os.Getwd()
	if err != nil {
		return absPathOrFallback("homework.db")
	}

	current := wd
	for {
		goModPath := filepath.Join(current, "go.mod")
		if stat, statErr := os.Stat(goModPath); statErr == nil && !stat.IsDir() {
			return absPathOrFallback(filepath.Join(current, "homework.db"))
		}

		parent := filepath.Dir(current)
		if parent == current {
			break
		}
		current = parent
	}

	return absPathOrFallback("homework.db")
}

func absPathOrFallback(path string) string {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return path
	}
	return absPath
}

func migrateUserInfoTable() {
	if DB == nil {
		return
	}

	hasStudentInfo := DB.Migrator().HasTable("student_info")
	hasUserInfo := DB.Migrator().HasTable("user_info")

	if hasStudentInfo && !hasUserInfo {
		if err := DB.Migrator().RenameTable("student_info", "user_info"); err != nil {
			log.Printf("Failed to rename table student_info to user_info: %v", err)
		}
	}

	if DB.Migrator().HasTable("user_info") && DB.Migrator().HasColumn("user_info", "student_id") && !DB.Migrator().HasColumn("user_info", "user_id") {
		if err := DB.Migrator().RenameColumn("user_info", "student_id", "user_id"); err != nil {
			log.Printf("Failed to rename column student_id to user_id in user_info: %v", err)
		}
	}
}

func migrateEnrollmentTable() {
	if DB == nil {
		return
	}

	hasStudentEnrollment := DB.Migrator().HasTable("StudentEnrollment")
	hasEnrollment := DB.Migrator().HasTable("Enrollment")

	if hasStudentEnrollment && !hasEnrollment {
		if err := DB.Migrator().RenameTable("StudentEnrollment", "Enrollment"); err != nil {
			log.Printf("Failed to rename table StudentEnrollment to Enrollment: %v", err)
		}
	}

	if DB.Migrator().HasTable("Enrollment") && DB.Migrator().HasColumn("Enrollment", "student_id") && !DB.Migrator().HasColumn("Enrollment", "user_id") {
		if err := DB.Migrator().RenameColumn("Enrollment", "student_id", "user_id"); err != nil {
			log.Printf("Failed to rename column student_id to user_id in Enrollment: %v", err)
		}
	}
}

func ensureClassSessionTable() {
	if DB == nil {
		return
	}

	query := `
		CREATE TABLE IF NOT EXISTS "ClassSession" (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			course_id INTEGER NOT NULL,
			session_date DATE NOT NULL,
			start_at DATETIME NOT NULL,
			end_at DATETIME NOT NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
			capacity INTEGER,
			created_at DATETIME,
			updated_at DATETIME,
			UNIQUE(course_id, session_date),
			FOREIGN KEY (course_id) REFERENCES "Course"(id) ON UPDATE CASCADE ON DELETE CASCADE
		);
		CREATE INDEX IF NOT EXISTS idx_class_session_course_id ON "ClassSession" (course_id);
		CREATE INDEX IF NOT EXISTS idx_class_session_date ON "ClassSession" (session_date);
		CREATE INDEX IF NOT EXISTS idx_class_session_status ON "ClassSession" (status);
	`

	if err := DB.Exec(query).Error; err != nil {
		log.Printf("Failed to ensure ClassSession table exists: %v", err)
	}
}

// migrateClassSessions generates past ClassSession rows (completed) and marks
// sessions on or before today as "completed". Runs only once — skips if past
// sessions already exist.
func migrateClassSessions() {
	if DB == nil {
		return
	}

	// Check if we already have completed sessions (migration already ran).
	var completedCount int64
	DB.Raw(`SELECT COUNT(*) FROM ClassSession WHERE status = 'completed'`).Scan(&completedCount)
	if completedCount > 0 {
		return
	}

	// Determine the earliest enrollment date so we generate sessions that far back.
	var earliest string
	DB.Raw(`SELECT MIN(DATE(enroll_time)) FROM Enrollment`).Scan(&earliest)
	if earliest == "" {
		earliest = time.Now().AddDate(0, -3, 0).Format("2006-01-02")
	}

	startDate, err := time.Parse("2006-01-02", earliest)
	if err != nil {
		log.Printf("migrateClassSessions: failed to parse earliest date: %v", err)
		return
	}

	today := time.Now().UTC()
	today = time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, time.UTC)

	weekdayMap := map[string]time.Weekday{
		"sun": time.Sunday, "mon": time.Monday, "tue": time.Tuesday,
		"wed": time.Wednesday, "thu": time.Thursday, "fri": time.Friday,
		"sat": time.Saturday,
	}

	// Fetch all courses.
	type courseRow struct {
		ID        uint
		Weekday   string
		StartTime string
		EndTime   string
		Capacity  int
	}
	var courses []courseRow
	DB.Raw(`SELECT id, weekday, start_time, end_time, capacity FROM Course`).Scan(&courses)

	now := time.Now()
	inserted := 0
	for _, c := range courses {
		wd := strings.ToLower(strings.TrimSpace(c.Weekday))
		if len(wd) > 3 {
			wd = wd[:3]
		}
		targetDay, ok := weekdayMap[wd]
		if !ok {
			continue
		}

		// Find the first occurrence of targetDay on or after startDate.
		d := startDate
		for d.Weekday() != targetDay {
			d = d.AddDate(0, 0, 1)
		}

		startH, startM := parseHHMM(c.StartTime)
		endH, endM := parseHHMM(c.EndTime)

		for d.Before(today) || d.Equal(today) {
			sessionDate := d.Format("2006-01-02")
			startAt := time.Date(d.Year(), d.Month(), d.Day(), startH, startM, 0, 0, time.UTC)
			endAt := time.Date(d.Year(), d.Month(), d.Day(), endH, endM, 0, 0, time.UTC)

			status := "completed"
			if d.After(today) {
				status = "scheduled"
			}

			err := DB.Exec(`
				INSERT INTO ClassSession (course_id, session_date, start_at, end_at, status, capacity, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(course_id, session_date) DO UPDATE SET status = excluded.status
			`, c.ID, sessionDate, startAt.Format(time.RFC3339), endAt.Format(time.RFC3339),
				status, c.Capacity, now.Format(time.RFC3339), now.Format(time.RFC3339)).Error

			if err != nil {
				log.Printf("migrateClassSessions: insert failed for course %d date %s: %v", c.ID, sessionDate, err)
			} else {
				inserted++
			}

			d = d.AddDate(0, 0, 7)
		}
	}

	// Also mark any existing future-generated sessions that are now in the past as completed.
	DB.Exec(`UPDATE ClassSession SET status = 'completed', updated_at = ? WHERE session_date < ? AND status = 'scheduled'`,
		now.Format(time.RFC3339), today.Format("2006-01-02"))

	log.Printf("migrateClassSessions: inserted/updated %d past sessions", inserted)
}

// migrateEnrollmentSessionIDs backfills session_id in Enrollment rows where it is NULL.
// Matches each enrollment to the closest ClassSession by course_id and enroll_time date.
func migrateEnrollmentSessionIDs() {
	if DB == nil {
		return
	}

	// Check if there are any NULL session_ids to fix.
	var nullCount int64
	DB.Raw(`SELECT COUNT(*) FROM Enrollment WHERE session_id IS NULL`).Scan(&nullCount)
	if nullCount == 0 {
		return
	}

	// For each enrollment with NULL session_id, find the ClassSession whose session_date
	// is on or after the enrollment date (same course), picking the closest one.
	result := DB.Exec(`
		UPDATE Enrollment
		SET session_id = (
			SELECT cs.id
			FROM ClassSession cs
			WHERE cs.course_id = Enrollment.course_id
			  AND cs.session_date >= DATE(Enrollment.enroll_time)
			ORDER BY cs.session_date ASC
			LIMIT 1
		)
		WHERE session_id IS NULL
	`)

	if result.Error != nil {
		log.Printf("migrateEnrollmentSessionIDs: update failed: %v", result.Error)
		return
	}

	// For any remaining NULLs (enrollment date before earliest session), use the earliest session.
	DB.Exec(`
		UPDATE Enrollment
		SET session_id = (
			SELECT cs.id
			FROM ClassSession cs
			WHERE cs.course_id = Enrollment.course_id
			ORDER BY cs.session_date ASC
			LIMIT 1
		)
		WHERE session_id IS NULL
	`)

	log.Printf("migrateEnrollmentSessionIDs: backfilled %d enrollment(s)", result.RowsAffected)
}

// ensureEnrollmentUniqueConstraint adds UNIQUE(user_id, course_id, session_id) to Enrollment.
// SQLite doesn't support ADD CONSTRAINT, so we create a unique index instead.
func ensureEnrollmentUniqueConstraint() {
	if DB == nil {
		return
	}

	err := DB.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollment_user_course_session ON Enrollment (user_id, course_id, session_id)`).Error
	if err != nil {
		log.Printf("ensureEnrollmentUniqueConstraint: %v", err)
	}
}

// parseHHMM parses "HH:MM" or "HH:MM:SS" into hour and minute.
func parseHHMM(s string) (int, int) {
	s = strings.TrimSpace(s)
	var h, m int
	fmt.Sscanf(s, "%d:%d", &h, &m)
	return h, m
}

func ensureUserDailyActivityTable() {
	if DB == nil {
		return
	}

	query := `
		CREATE TABLE IF NOT EXISTS "UserDailyActivity" (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			enrollment_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL,
			course_id INTEGER NOT NULL,
			activity_date DATE NOT NULL,
			created_at DATETIME,
			UNIQUE(enrollment_id, activity_date),
			FOREIGN KEY (enrollment_id) REFERENCES "Enrollment"(id) ON UPDATE CASCADE ON DELETE CASCADE,
			FOREIGN KEY (user_id) REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE,
			FOREIGN KEY (course_id) REFERENCES "Course"(id) ON UPDATE CASCADE ON DELETE CASCADE
		);
		CREATE INDEX IF NOT EXISTS idx_user_daily_activity_user_id ON "UserDailyActivity" (user_id);
		CREATE INDEX IF NOT EXISTS idx_user_daily_activity_course_id ON "UserDailyActivity" (course_id);
		CREATE INDEX IF NOT EXISTS idx_user_daily_activity_activity_date ON "UserDailyActivity" (activity_date);
	`

	if err := DB.Exec(query).Error; err != nil {
		log.Printf("Failed to ensure UserDailyActivity table exists: %v", err)
	}
}

func migrateCourseInstructorColumn() {
    if DB == nil {
        return
    }

    if DB.Migrator().HasTable("Course") && !DB.Migrator().HasColumn("Course", "instructor_id") {
        if err := DB.Exec(`ALTER TABLE "Course" ADD COLUMN instructor_id INTEGER;`).Error; err != nil {
            log.Printf("Failed to add instructor_id to Course: %v", err)
        }
    }
}