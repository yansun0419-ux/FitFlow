

# ✅ 1) Course Registration (this API already existed before; only the name was slightly changed, no functional impact)
**Endpoint**: `POST /classes/register`  
**Function**: Student registers for a course, **writes status as enrolled** (replaces original registered)
**Logic**:  RegisterClass now checks: user exists, class exists, registration window (opens 25h before start), duplicate enrollment, schedule overlap with existing enrolled classes
**Request Body (JSON)**:
```json
{
  "course_id": 7
}
```

---

# ✅ 2)  Overlap detection logic:
Added weekday normalization and time range overlap checks.
Prevents enrollment when same-day time ranges overlap.

---

# ✅ 3) Class session generation support:
Added GenerateClassSessions for weekly session creation.
Generates future sessions by weekday and upserts them.

---

# ✅ 4) Instructor fetches their own course list (new)
**Endpoint**: `GET /instructor/courses`  
**Function**: Instructor views the courses they are responsible for

**Parameters**: None (GET has no body)

**Header**:
```
Authorization: Bearer <token>
```

---

# ✅ 5) Instructor fetches all enrollments for a course (new)
**Endpoint**: `GET /instructor/courses/:id/enrollments`  
**Function**: Instructor views all students enrolled in the course (with permission check)

**Parameters**: None (GET has no body)

**Header**:
```
Authorization: Bearer <token>
```

---

# ✅ 6) Instructor marks student attendance (new)
**Endpoint**: `PATCH /instructor/courses/:id/enrollments`  
**Function**: Instructor updates student enrollment status (with enrollment check)

**Request Body (JSON)**:
```json
{
  "user_id": 15,
  "status": "attended"
}
```

**Allowed status values**:
```
enrolled | attended | missed
```

**Header**:
```
Authorization: Bearer <token>
```

---

# ✅ 7) SuperManager updates user role; only supermanager (Role==2) has permission
**Endpoint**: `POST /auth/roles/assign`  
**Function**: SuperManager assigns a user role (e.g., Instructor / Manager)

**Request Body (JSON)**:
```json
{
  "user_id": 20,
  "role_name": "Instructor"
}
```

**Header**:
```
Authorization: Bearer <token>
```

---

# ✅ 8) Manager fetches all users (new + pagination)
**Endpoint**: `GET /manager/users?page=1&limit=20`  
**Function**: Manager gets user list (default 20 per page)

**Parameters**: None (GET has no body)

**Header**:
```
Authorization: Bearer <token>
```

---

# ✅ 9) Manager views a user’s enrollments
**Endpoint**: `GET /manager/users/:id/enrollments`  
**Function**: Manager views the courses and status for a specific user

**Parameters**: None (GET has no body)

**Header**:
```
Authorization: Bearer <token>
```

---

# ✅ 10) Manager adds a course for a user
**Endpoint**: `POST /manager/users/:id/enrollments`  
**Function**: Manager adds a course for the user

**Request Body (JSON)**:
```json
{
  "course_id": 7
}
```

**Header**:
```
Authorization: Bearer <token>
```

---

# ✅ 11) Manager removes a user from a course
**Endpoint**: `DELETE /manager/users/:id/enrollments/:course_id`  
**Function**: Manager deletes a user’s enrolled course

**Parameters**: None (DELETE has no body)

**Header**:
```
Authorization: Bearer <token>
```

---
# ✅ 12) Demo database setup and data seeding work
Improved demo DB preparation and seeding flow, including seed orchestration and fixture quality for roles/users/classes/enrollments used in testing and demo runs.
Files: `main.go`, `seeders.go`, `db.go`

---
