-- ============================================================================
-- ClassSession Table for FitFlow
-- ============================================================================
-- This SQL creates the ClassSession table to support recurring weekly classes.
-- Each ClassSession is one dated occurrence of a recurring Course.
-- ============================================================================

-- Create ClassSession table
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

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_class_session_course_id ON "ClassSession" (course_id);
CREATE INDEX IF NOT EXISTS idx_class_session_date ON "ClassSession" (session_date);
CREATE INDEX IF NOT EXISTS idx_class_session_status ON "ClassSession" (status);

-- ============================================================================
-- Update Enrollment Table
-- ============================================================================
-- Add session_id column to Enrollment table to link enrollments to specific sessions.
-- This is initially nullable for backward compatibility.
-- ============================================================================

ALTER TABLE "Enrollment"
ADD COLUMN session_id INTEGER;

-- Add foreign key constraint for session_id (if your SQLite supports deferred fk)
-- Note: SQLite may require recreating the table if it doesn't support ALTER TABLE ADD CONSTRAINT.
-- Alternative approach using trigger or direct query rebuild can be used if needed.

-- Create index on session_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_enrollment_session_id ON "Enrollment" (session_id);

-- ============================================================================
-- Example: How ClassSession works
-- ============================================================================
-- 
-- Course Row:
--   id=5, name='Morning Yoga', weekday='Monday', start_time='09:00', end_time='10:00', capacity=20
-- 
-- ClassSession Rows (auto-generated for 12 weeks starting from today):
--   id=1, course_id=5, session_date='2026-04-06', start_at='2026-04-06 09:00:00', end_at='2026-04-06 10:00:00', status='scheduled'
--   id=2, course_id=5, session_date='2026-04-13', start_at='2026-04-13 09:00:00', end_at='2026-04-13 10:00:00', status='scheduled'
--   id=3, course_id=5, session_date='2026-04-20', start_at='2026-04-20 09:00:00', end_at='2026-04-20 10:00:00', status='scheduled'
--   ... (continuing for 12 weeks)
-- 
-- Enrollment Row (student enrolled in specific session):
--   id=1, user_id=3, course_id=5, session_id=1, status='enrolled'    <- Enrolled in 2026-04-06 session
--   id=2, user_id=3, course_id=5, session_id=2, status='enrolled'    <- Enrolled in 2026-04-13 session
--
-- ============================================================================
