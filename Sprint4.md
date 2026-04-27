## Sprint Summary


### 1. Return All Classes (Remove Pagination)
The `GET /classes` endpoint previously returned a paginated subset of classes. It now returns all classes in a single response.

- Removed `page` and `pageSize` query parameters from the handler
- Updated `ListClassesPaged` in the service and DAO layers accordingly
- Response structure remains the same; the full class list is returned in one call

---

### 2. Instructor Profile (Instructor Table)
Designed and implemented a dedicated `Instructor` table to store instructor-specific profile data, separate from the general `User` table.

**New table — `Instructor`:**
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key |
| `user_id` | INTEGER | FK → User (role_id = 4 only) |
| `bio` | TEXT | Instructor biography |

- Added `model/instructor.go` with the `Instructor` struct
- Auto-migration creates the table on startup
- The `Course` table's `instructor_id` (integer FK) column was replaced with `instructor` (TEXT), storing the instructor's display name directly
- A one-time migration (`migrateCourseInstructorToName`) backfills existing rows with the correct name
- Instructor ownership checks in all service methods now use name-based comparison instead of ID-based

---

### 3. Class Filter (Category & Day of Week)
Students can now filter the class list by category and/or day of the week on the class exploration page.

**Updated endpoint:** `GET /classes?category=Yoga&weekday=1`

| Query Param | Type | Description |
|---|---|---|
| `category` | string | Filter by class category (e.g. `Yoga`, `Pilates`) |
| `weekday` | int | Filter by day of week (`0` = Sunday … `6` = Saturday) |

- Both filters are optional and can be combined
- Added `GET /classes/categories` endpoint to return all distinct category values for populating the filter dropdown
- DAO, service, and API layers all updated to pass filters through the full call chain
