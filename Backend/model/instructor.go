package model

// Instructor represents an instructor profile, one-to-one with a User (role_id=4).
type Instructor struct {
	ID     uint   `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	UserID uint   `gorm:"column:user_id;not null;uniqueIndex" json:"user_id"`
	Name   string `gorm:"column:name" json:"name"`
	Bio    string `gorm:"column:bio" json:"bio"`

	User User `gorm:"foreignKey:UserID" json:"user"`
}

func (Instructor) TableName() string { return "Instructor" }
