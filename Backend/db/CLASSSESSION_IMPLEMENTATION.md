# ClassSession Implementation Guide

## Overview

The ClassSession table has been implemented to support recurring weekly classes with dated occurrences. This allows the system to:

1. **Track per-session enrollment** - Students enroll in specific class occurrences (e.g., Monday April 6th), not just the recurring template
2. **Accurate scheduling** - Display only future enrolled sessions in the "My Schedule" view
3. **Detailed analytics** - Track attendance/missed for specific session dates in the analytics view

## Database Changes

### New Table: ClassSession

A new `ClassSession` table stores individual dated occurrences of each recurring Course.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS "ClassSession" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    session_date DATE NOT NULL,                    -- YYYY-MM-DD format
    start_at DATETIME NOT NULL,                    -- Full datetime with time
    end_at DATETIME NOT NULL,                      -- Full datetime with time
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    capacity INTEGER,                              -- Optional override
    created_at DATETIME,
    updated_at DATETIME,
    UNIQUE(course_id, session_date),
    FOREIGN KEY (course_id) REFERENCES "Course"(id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_class_session_course_id ON "ClassSession" (course_id);
CREATE INDEX idx_class_session_date ON "ClassSession" (session_date);
CREATE INDEX idx_class_session_status ON "ClassSession" (status);
```

### Updated Table: Enrollment

The `Enrollment` table now includes an optional `session_id` column:

```sql
ALTER TABLE "Enrollment"
ADD COLUMN session_id INTEGER;

CREATE INDEX idx_enrollment_session_id ON "Enrollment" (session_id);
```

## How It Works

### 1. Course Creation/Update

When a manager creates or updates a Course:
- The system generates 12 weeks of ClassSession rows automatically
- Each session_date corresponds to the next occurrence of the course's weekday
- Example: If Course.weekday = 'Monday' and today is April 6, 2026 (a Monday):
  - Sessions generated for: 4/6, 4/13, 4/20, 4/27, 5/4, 5/11, 5/18, 5/25, 6/1, 6/8, 6/15, 6/22

### 2. Student Enrollment

When a student enrolls in a course (POST /classes/register):
- **Old behavior** (still supported): Enroll in course template
  - Sets enrollment.course_id, session_id = NULL
- **New behavior**: Enroll in specific session
  - Sets enrollment.course_id AND enrollment.session_id
  - Conflict detection checks for overlaps on the same session_date

### 3. Schedule View (My Schedule)

Query returns future enrolled sessions only:
```sql
SELECT c.* FROM ClassSession cs
JOIN Course c ON c.id = cs.course_id
JOIN Enrollment e ON e.session_id = cs.id
WHERE e.user_id = ? 
  AND e.status = 'enrolled'
  AND cs.session_date >= CAST(date('now') AS DATE)
ORDER BY cs.session_date ASC, c.start_time ASC
```

Result: Student sees only upcoming classes they enrolled in, with exact dates.

### 4. Analytics View

Query returns past attended sessions only:
```sql
SELECT COUNT(*) as total_classes, SUM(c.duration) as total_time
FROM ClassSession cs
JOIN Enrollment e ON e.session_id = cs.id
JOIN Course c ON c.id = cs.course_id
WHERE e.user_id = ? 
  AND e.status = 'attended'
  AND cs.session_date BETWEEN ? AND ?
```

Result: Student sees historical attendance metrics for completed sessions.

## Migration Steps for Team

1. **Run the SQL** in `Backend/db/sql/create_class_session.sql` on your database:
   ```bash
   sqlite3 homework.db < Backend/db/sql/create_class_session.sql
   ```

2. **Update your database schema** if using migrations (e.g., schema versioning):
   - Add version entry for ClassSession table creation
   - Foreign key constraints between Enrollment.session_id and ClassSession.id

3. **Test the changes**:
   - Restart the backend (it will auto-create the tables if missing via ensureClassSessionTable())
   - Create a new course - verify ClassSession rows are generated for 12 weeks
   - Enroll a student in a course - verify Enrollment records are created/returned correctly

4. **Verify data**:
   ```sql
   -- Check ClassSession rows
   SELECT * FROM ClassSession LIMIT 5;
   
   -- Check Enrollment with session info
   SELECT e.id, e.user_id, c.name, cs.session_date 
   FROM Enrollment e
   JOIN Course c ON e.course_id = c.id
   LEFT JOIN ClassSession cs ON e.session_id = cs.id
   LIMIT 5;
   ```

## Code Changes

### model/class.go
- Added `ClassSession` struct with GORM model tags
- Updated `Enrollment` struct to include `session_id *uint` (nullable)

### db/db.go
- Added import of `model` package
- Added `ensureClassSessionTable()` function to auto-create table and migrate Enrollment column
- Updated `InitDB()` to call `ensureClassSessionTable()`

### service/session_service.go (NEW)
- `GenerateClassSessions(courseID, numWeeks)` - Generates ClassSession rows for a course
- Helper functions for weekday parsing and datetime combining

### service/manager_service.go
- Updated `ManagerCreateCourse()` to auto-generate sessions
- Updated `ManagerUpdateCourse()` to regenerate sessions

## Backward Compatibility

The `session_id` column is **nullable** to support existing enrollments:
- Old enrollments without session_id will still work
- New registrations should use session_id
- Future migration can backfill session_id for old enrollments based on enroll_time and course weekday

## Status Values

ClassSession has these status values:
- `'scheduled'` - Upcoming or today
- `'canceled'` - Class was canceled
- `'completed'` - Class occurrence has passed

Enrollment status values (unchanged):
- `'enrolled'` - Student registered, not yet attended
- `'attended'` - Student attended
- `'missed'` - Student didn't attend

## Example Data Flow

```
Manager creates: "Morning Yoga" (Monday, 09:00-10:00, capacity 20)
  ↓
Backend Auto-generates ClassSession rows:
  - id=1, session_date='2026-04-06', start_at='2026-04-06 09:00:00'
  - id=2, session_date='2026-04-13', start_at='2026-04-13 09:00:00'
  - ... (12 weeks total)
  ↓
Student enrolls in Morning Yoga
  → Backend now needs to ask: which session? Or auto-enroll all future sessions?
  → Currently: Backend creates enrollment with course_id, session_id = NULL (needs API update)
  ↓
My Schedule endpoint filters:
  WHERE session_date >= TODAY AND enrollment.status = 'enrolled'
  → Shows: April 6, April 13, April 20, etc.
  ↓
Analytics endpoint filters:
  WHERE session_date < TODAY AND enrollment.status = 'attended'
  → Shows: Historical data (none if all classes still in future)
```

## Next Steps

1. Apply SQL changes to all team members' databases
2. Update the registration API to support session_id (currently in progress)
3. Update conflict detection to check for overlaps on the same session_date
4. Update schedule and analytics queries to use session_id
5. Backfill existing enrollments with session_id based on enroll_time
