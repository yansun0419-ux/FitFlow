package model

import "time"

const (
	EnrollmentStatusEnrolled = "enrolled"
	EnrollmentStatusAttended = "attended"
	EnrollmentStatusMissed   = "missed"
)

// Course represents the Course table in SQLite.
type Course struct {
	ID uint `gorm:"primaryKey;autoIncrement;column:id" json:"id"`

	CourseName string `gorm:"column:course_name;not null" json:"name"`
	CourseCode string `gorm:"column:course_code;not null" json:"course_code"`

	Description string `gorm:"column:description" json:"description"`

	StartTime TimeOnly `gorm:"column:start_time;type:time" json:"start_time"`
	EndTime   TimeOnly `gorm:"column:end_time;type:time" json:"end_time"`

	Capacity int `gorm:"column:capacity;not null" json:"capacity"`

	Duration int    `gorm:"column:duration" json:"duration"`
	Category string `gorm:"column:category" json:"category"`
	Weekday  string `gorm:"column:weekday" json:"weekday"`

	Spot int `gorm:"-" json:"spot"`
}

// ClassSession represents a single occurrence of a recurring course.
type ClassSession struct {
	ID          uint      `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	CourseID    uint      `gorm:"column:course_id;not null;index" json:"course_id"`
	SessionDate string    `gorm:"column:session_date;not null;index" json:"session_date"` // YYYY-MM-DD
	StartAt     time.Time `gorm:"column:start_at;not null" json:"start_at"`
	EndAt       time.Time `gorm:"column:end_at;not null" json:"end_at"`
	Status      string    `gorm:"column:status;not null;default:'scheduled'" json:"status"` // scheduled, canceled, completed
	Capacity    int       `gorm:"column:capacity" json:"capacity"`                          // override if set, else use Course.Capacity

	Course Course `gorm:"foreignKey:CourseID" json:"course"`
	Spot   int    `gorm:"-" json:"spot"`
}

// Enrollment is the join table between User and Course/ClassSession.
type Enrollment struct {
	ID        uint  `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint  `gorm:"column:user_id;not null" json:"user_id"`
	CourseID  uint  `gorm:"column:course_id;not null" json:"course_id"`
	SessionID *uint `gorm:"column:session_id" json:"session_id"` // nullable for backward compatibility

	User    User          `gorm:"foreignKey:UserID" json:"user"`
	Course  Course        `gorm:"foreignKey:CourseID" json:"course"`
	Session *ClassSession `gorm:"foreignKey:SessionID" json:"session"`

	Status     string    `gorm:"column:status;not null" json:"status"`
	EnrollTime time.Time `gorm:"column:enroll_time;autoCreateTime" json:"enroll_time"`
}

func (Course) TableName() string {
	return "Course"
}

func (ClassSession) TableName() string {
	return "ClassSession"
}

func (Enrollment) TableName() string {
	return "Enrollment"
}

type EnrollmentRequest struct {
	CourseID uint `json:"course_id" binding:"required"`
}
