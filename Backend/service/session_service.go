package service

import (
	"fmt"
	"my-course-backend/dao"
	"my-course-backend/db"
	"my-course-backend/model"
	"strings"
	"time"

	"gorm.io/gorm/clause"
)

// GenerateClassSessions creates ClassSession rows for the given course for the next N weeks.
// This should be called when a course is created or updated.
// numWeeks: how many weeks ahead to generate sessions (typically 8-12)
func GenerateClassSessions(courseID uint, numWeeks int) error {
	if numWeeks < 1 {
		numWeeks = 12 // default to 12 weeks
	}

	// Fetch the course
	course, err := dao.GetCourseByID(courseID)
	if err != nil {
		return fmt.Errorf("course not found: %w", err)
	}

	// Parse course weekday (e.g., "Monday", "Mon")
	targetWeekday := normalizeWeekdayForGeneration(course.Weekday)
	if targetWeekday == "" {
		return fmt.Errorf("invalid weekday: %s", course.Weekday)
	}

	// Generate sessions starting from today
	today := time.Now().UTC()
	today = time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, time.UTC)

	// Find the first occurrence of the target weekday from today
	firstSessionDate := getNextOccurrenceOfWeekday(today, targetWeekday)

	// Generate session rows for numWeeks
	for i := 0; i < numWeeks; i++ {
		sessionDate := firstSessionDate.AddDate(0, 0, i*7) // add i weeks

		session := &model.ClassSession{
			CourseID:    courseID,
			SessionDate: sessionDate.Format("2006-01-02"),
			StartAt:     combineDateTime(sessionDate, course.StartTime),
			EndAt:       combineDateTime(sessionDate, course.EndTime),
			Status:      "scheduled",
			Capacity:    course.Capacity,
		}

		// Insert or update (upsert)
		if err := db.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(session).Error; err != nil {
			return fmt.Errorf("failed to create session: %w", err)
		}
	}

	return nil
}

// getNextOccurrenceOfWeekday returns the next date that is the target weekday, starting from fromDate.
// targetWeekday should be lowercase 3-letter abbreviation (mon, tue, wed, thu, fri, sat, sun).
func getNextOccurrenceOfWeekday(fromDate time.Time, targetWeekday string) time.Time {
	weekdayMap := map[string]string{
		"mon": "Monday",
		"tue": "Tuesday",
		"wed": "Wednesday",
		"thu": "Thursday",
		"fri": "Friday",
		"sat": "Saturday",
		"sun": "Sunday",
	}

	targetDayName, ok := weekdayMap[targetWeekday]
	if !ok {
		// If invalid, return fromDate (best effort)
		return fromDate
	}

	current := fromDate
	for i := 0; i < 7; i++ {
		if current.Weekday().String() == targetDayName {
			return current
		}
		current = current.AddDate(0, 0, 1)
	}

	return fromDate // fallback
}

// normalizeWeekdayForGeneration normalizes weekday string to 3-letter lowercase.
func normalizeWeekdayForGeneration(weekday string) string {
	trimmed := strings.ToLower(strings.TrimSpace(weekday))
	if len(trimmed) <= 3 {
		return trimmed
	}
	return trimmed[:3]
}

// combineDateTime combines a date part with a TimeOnly time part into a full DateTime.
func combineDateTime(date time.Time, timeOnly model.TimeOnly) time.Time {
	if timeOnly.Time.IsZero() {
		// If time is zero, use midnight
		return date
	}
	hour, minute, second := timeOnly.Time.Clock()
	return time.Date(date.Year(), date.Month(), date.Day(), hour, minute, second, 0, date.Location())
}
