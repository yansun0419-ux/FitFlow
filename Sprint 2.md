# Sprint 2.md

## 1) Entire Team
- Make progress on issues uncompleted in Sprint 1  
- Integrate frontend and backend  

## 2) Frontend
- Write a very simple test using Cypress (can be as simple as clicking a button or filling a form)  
- Write unit tests specific to your chosen frontend framework  
- There is no specific number of unit tests to complete, but aim for a **1:1 unit test to function ratio**  

## 3) Backend
- Detailed documentation of your backend API (**saved in this Sprint 2.md**)  
- Write unit tests specific to your chosen backend framework  
- There is no specific number of unit tests to complete, but aim for a **1:1 unit test to function ratio**  

---

## User Stories

### 1) Analytics — View my analytics
**As a logged-in user**, I want to view my activity analytics over a selected time range, so that I can understand my exercise patterns (daily activity + category distribution).

**Acceptance Criteria**
- Must be authenticated (Bearer token)
- Can only request analytics for self: token `id` must match path `:id`
- Supports `range` query: `7d`, `1m`, `3m` (default `7d`)
- Returns aggregated stats:
  - total classes, total time, active days
  - daily breakdown
  - category breakdown + percentage (rounded to 2 decimals)

**Backend Work Completed**
- Implemented analytics endpoint and authorization checks
- Service computes analytics and backfills `UserDailyActivity` from enrollments before computing analytics

---

### 2) Manager — Create a class
**As a Manager**, I want to create new fitness classes, so that students can browse and enroll.

**Acceptance Criteria**
- Only `role_id == 3` (Manager) and `role_id == 2` (SuperManager) can create classes
- Invalid JSON/validation errors return **400**
- Success returns **201** and created class

**Backend Work Completed**
- `POST /classes` (`api.ManagerCreateClass`)
- Uses `service.CourseUpsertInput`
- Persists via `dao.CreateCourse`

---

### 3) Manager — Update a class
**As a Manager**, I want to update class info (name, time, capacity, etc.), so that class details remain accurate.

**Acceptance Criteria**
- Only `role_id == 3` (Manager) and `role_id == 2` (SuperManager) can update classes
- Invalid class id returns **400**
- Class not found returns **404**
- Success returns **200** and updated class

**Backend Work Completed**
- `PUT /classes/:id` (`api.ManagerUpdateClass`)
- `service.ManagerUpdateCourse(id, input)` loads/updates/saves
- Handles `"class not found"`

---

### 4) Manager — Delete a class
**As a Manager**, I want to delete a class, so that outdated/incorrect classes are removed.

**Acceptance Criteria**
- Only `role_id == 3` (Manager) and `role_id == 2` (SuperManager) can delete
- Invalid class id returns **400**
- Class not found returns **404**
- Success returns **200** with message

**Backend Work Completed**
- `DELETE /classes/:id` (`api.ManagerDeleteClass`)
- `service.ManagerDeleteCourse(id)` deletes with existence check

---

### 5) Manager — Register with invite code
**As a Manager (new admin)**, I want to register using an invite code, so that only authorized managers can create accounts.

**Acceptance Criteria**
- Requires invite code
- Email must be unique
- Invite code must be valid/active/not used/not expired
- If invite is bound to an email, invitee_email must match
- Success returns **201**
- Errors:
  - **409** email exists
  - **400** invalid invite code
  - **403** inactive/used/expired/not allowed

**Backend Work Completed**
- `POST /auth/manager/register` (`api.ManagerRegister`)
- `service.RegisterManager(input)` transaction: validate invite → create manager user → mark invite used

---

### 6) SuperManager — Create manager invite codes
**As a SuperManager**, I want to generate invite codes for managers, so that manager registration is controlled.

**Acceptance Criteria**
- Only `role_id == 2` can create invite codes
- Invalid input returns **400**
- Success returns **201** and generated code
- Invite has expiration (`expire_hours`)
- Invite can optionally be bound to an email (`invitee_email`)

**Backend Work Completed**
- `POST /auth/manager/invite-codes` (`api.CreateManagerInviteCode`)
- `service.CreateManagerInviteCode(inviterID, input)` generates code, inserts row in transaction, collision-safe retry
- DAO: `dao.CreateManagerInviteCodeTx`
- Model: `model.ManagerInviteCode`, input: `model.CreateManagerInviteInput`

---

### 7) Backend unit tests (Sprint 2)
**What we tested (by file)**
- `Backend/routes/class_routes_test.go`
  - `TestRegisterClassEndpoint_Created` (201)
  - `TestRegisterClassEndpoint_Conflict` (409)
  - `TestDropClassEndpoint_OK` (200)
  - `TestDropClassEndpoint_NotFound` (404)
  - `TestListClassesEndpoint_OK` (200)
  - `TestGetUserAnalyticsEndpoint_OK` (200)
  - `TestGetUserAnalyticsEndpoint_Forbidden` (403)

- `Backend/routes/manager_routes_test.go`
  - `TestManagerCanUpdateClass` (200)
  - `TestStudentCannotUpdateClass` (403)

- `Backend/routes/supermanager_invite_routes_test.go`
  - `TestSuperManagerCanCreateInviteCode` (201)
  - `TestManagerCannotCreateInviteCode` (403)

- `Backend/service/class_service_test.go`
  - `TestRegisterClass_Success`
  - `TestRegisterClass_UserNotFound`
  - `TestRegisterClass_ClassNotFound`
  - `TestRegisterClass_AlreadyExists`
  - `TestRegisterClass_ClassFull`
  - `TestDropClass_Success`
  - `TestDropClass_NotFound`
  - `TestListClassesPaged_ReturnsSpotAndPagination`
  - `TestGetUserAnalytics_SuccessWithPercentages`
  - `TestGetUserAnalytics_UserNotFound`

**How to run**
- `cd Backend`
- All tests: `go test ./... -v -count=1`
- Route tests only: `go test ./routes -v -count=1`
- Service tests only: `go test ./service -v -count=1`
- Manager tests only: `go test ./routes -v -count=1 -run TestManager`
- Analytics tests only:
  - `go test ./routes -v -count=1 -run TestGetUserAnalytics`
  - `go test ./service -v -count=1 -run TestGetUserAnalytics`

---

## API Design

### Roles (Authorization Summary)
- **Student**: `role_id = 1`
- **SuperManager**: `role_id = 2`
- **Manager**: `role_id = 3`

Authorization uses `Authorization: Bearer <JWT>` and reads `id` and `role_id` from JWT claims.

---

### 1) Analytics — Get user analytics
- **Method:** `GET`
- **Path:** `/users/:id/analytics`
- **Auth:** required
- **Authorization:** token `id` must match path `:id`

**Query**
- `range` (optional): `7d` | `1m` | `3m`
- Default: `7d`

**Success (200)**
```json
{
  "analytics": {
    "user_id": 50,
    "range": "1m",
    "from_date": "2026-02-12",
    "to_date": "2026-03-12",
    "total_classes": 14,
    "total_time": 285,
    "active_days": 12,
    "daily": [
      { "date": "2026-03-10", "classes": 2 }
    ],
    "categories": [
      { "category": "Cardio", "classes": 6, "percentage": 42.86 }
    ]
  }
}
```

**Errors**
- **401** missing/invalid token
- **403** token id mismatch
- **404** user not found (if applicable)
- **500** server error

---

### 2) SuperManager — Create manager invite code
- **Method:** `POST`
- **Path:** `/auth/manager/invite-codes`
- **Auth:** required
- **Role:** `role_id == 2`

**Request**
```json
{
  "invitee_email": "new.manager@example.com",
  "expire_hours": 24
}
```

**Success (201)**
```json
{
  "message": "Invite code created",
  "code": "ABCD1234EFGHI"
}
```

**Errors**
- **401** missing/invalid token
- **403** forbidden (not supermanager)
- **400** invalid payload
- **500** server error

---

### 3) Manager — Register with invite code
- **Method:** `POST`
- **Path:** `/auth/manager/register`
- **Auth:** not required

**Request**
```json
{
  "name": "Alice Manager",
  "email": "alice.manager@example.com",
  "password": "123456",
  "invite_code": "ABCD1234EFGHI"
}
```

**Success (201)**
```json
{
  "message": "Manager registration successful"
}
```

**Errors**
- **409** email already exists
- **400** invalid invite code / invalid payload
- **403** invite inactive/used/expired/not allowed
- **500** server error

---

### 4) Manager/SuperManager — Create class
- **Method:** `POST`
- **Path:** `/classes`
- **Auth:** required
- **Role:** `role_id == 2 || role_id == 3`

**Request**
```json
{
  "name": "Morning Yoga",
  "course_code": "YOGA-101",
  "description": "Beginner friendly yoga.",
  "start_time": "08:00",
  "end_time": "09:00",
  "capacity": 20,
  "duration": 60,
  "category": "Mind & Body",
  "weekday": "Monday"
}
```

**Success (201)**
```json
{
  "class": {
    "id": 1,
    "name": "Morning Yoga",
    "course_code": "YOGA-101",
    "description": "Beginner friendly yoga.",
    "start_time": "08:00:00",
    "end_time": "09:00:00",
    "capacity": 20,
    "duration": 60,
    "category": "Mind & Body",
    "weekday": "Monday",
    "spot": 20
  }
}
```

**Errors**
- **401** missing/invalid token
- **403** forbidden (role not allowed)
- **400** invalid payload
- **500** server error

---

### 5) Manager/SuperManager — Update class
- **Method:** `PUT`
- **Path:** `/classes/:id`
- **Auth:** required
- **Role:** `role_id == 2 || role_id == 3`

**Request**
Same as create.

**Success (200)**
```json
{
  "class": {
    "id": 1,
    "name": "Updated Name",
    "course_code": "NEW-101",
    "description": "Updated description",
    "start_time": "08:00:00",
    "end_time": "09:00:00",
    "capacity": 25,
    "duration": 60,
    "category": "Mind & Body",
    "weekday": "Tuesday",
    "spot": 25
  }
}
```

**Errors**
- **401** missing/invalid token
- **403** forbidden (role not allowed)
- **400** invalid class id / invalid payload
- **404** class not found
- **500** server error

---

### 6) Manager/SuperManager — Delete class
- **Method:** `DELETE`
- **Path:** `/classes/:id`
- **Auth:** required
- **Role:** `role_id == 2 || role_id == 3`

**Success (200)**
```json
{
  "message": "Class deleted successfully"
}
```

**Errors**
- **401** missing/invalid token
- **403** forbidden (role not allowed)
- **400** invalid class id
- **404** class not found
- **500** server error