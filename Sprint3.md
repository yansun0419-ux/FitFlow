### Sprint 3 Report: FitFlow Team
**Team Members**:  

Frontend: Forrest Yan Sun, Ila Adhikari  
Backend: Qing Li, Yingzhu Chen  

**Project Links**:  

🔗 GitHub Repository: https://github.com/Ilachan/FitFlow  
📺 Frontend Demo Video: 
📺 Backend Demo Video: 

---

### User Stories  

#### **User Story 1 – Student Registers for a Course**
**As a student, I want to register for a course within the registration window, so that I can participate in the class.**  

**Acceptance Criteria & Tasks**  
- **Acceptance Criteria**: 
    - Students can register for courses only within the registration time window.
    - Registration should check if the course exists, the student exists, and avoid duplicate enrollments.
    - Time conflicts with other enrolled courses should be avoided.
    - Successful registration should return feedback and redirect the user to the course list.

- [FE-1] Create a registration form allowing students to input `course_id`.  
- [FE-2] Handle API calls for course registration and display feedback messages.  
- [FE-3] Implement "Register Now" functionality with dynamic buttons on the course detail page.  
- [BE-1] Validate course and user data during registration.  
- [BE-2] Implement a new POST endpoint: `/classes/register`.  
- [BE-3] Write logic to return conflict/errors for duplicate enrollments or time clashes.  

---

#### **User Story 2 – Course Time Conflict Detection**
**As a student, I want the system to detect if the course timing overlaps with my existing schedule, so that I can avoid conflicts.**  

**Acceptance Criteria & Tasks**  
- **Acceptance Criteria**: 
    - Time conflicts must be checked before enrollment is finalized.
    - For enrollments with conflicts, the system should provide detailed feedback.  

- [FE-4] Show error messages and explain the conflicting courses if time overlaps occur.  
- [BE-4] Add backend logic for time conflict detection via weekday normalization and range overlap checks.  

---

#### **User Story 3 – Generate Course Sessions**
**As a course admin, I want to auto-generate future course sessions weekly, so that I can efficiently manage recurring courses.**  

**Acceptance Criteria & Tasks**  
- **Acceptance Criteria**: 
    - Admin can schedule course sessions automatically by specifying recurrence patterns (e.g., weekly).
    - The backend updates the database with all new sessions in bulk.

- [FE-5] Add a "Generate Sessions" button in course management UI.  
- [FE-6] Display feedback showing the success or failure of session generation.  
- [BE-5] Build and expose the `GenerateClassSessions` logic using a new backend function.  
- [BE-6] Add error handling for database bulk inserts or validation mismatches.  

---

#### **User Story 4 – Instructor Retrieves Their Courses**
**As an instructor, I want to view the list of courses I am responsible for, so that I can clearly understand my teaching load.**  

**Acceptance Criteria & Tasks**  
- **Acceptance Criteria**: 
    - Instructors can view all courses they are assigned to.
    - Only courses for the authenticated instructor are returned.  

- [FE-7] Create a course list page dynamically populated with API data.  
- [FE-8] Add navigation to the course list page from the dashboard.  
- [BE-7] Implement the `GET /instructor/courses` endpoint.  
- [BE-8] Ensure role validation so only instructors can access their data.  

---

#### **User Story 5 – Instructor Views Enrolled Students**
**As an instructor, I want to view all students enrolled in a specific course, so that I can monitor their enrollment progress.**  

**Acceptance Criteria & Tasks**  
- **Acceptance Criteria**: 
    - Displays student data (e.g., name, email, enrollment status) for the selected course.
    - API request must validate the instructor's permission.  

- [FE-9] Add a "View Students" section under the course detail page.  
- [FE-10] Handle pagination or large data loads in the student list table.  
- [BE-9] Create the `GET /instructor/courses/:id/enrollments` endpoint and add permission checks.  

---

#### **User Story 6 – Instructor Marks Student Attendance**
**As an instructor, I want to update the attendance status of students in my course, so that I can accurately record their participation.**  

**Acceptance Criteria & Tasks**  
- **Acceptance Criteria**: 
    - Attendance options include: "enrolled", "attended", and "missed".
    - Updates are valid only for current course participants.  

- [FE-11] Add an inline attendance update form for each student row.  
- [FE-12] Include filtering by attendance status in the UI.  
- [BE-10] Implement `PATCH /instructor/courses/:id/enrollments` endpoint with validation logic.  
- [BE-11] Write persistence logic for updating attendance in the database.  

---

#### **User Story 7 – SuperManager Assigns User Roles**
**As a SuperManager, I want to assign roles (e.g., instructor, manager) to users, so that I can define their system permissions accordingly.**  

**Acceptance Criteria & Tasks**  
- **Acceptance Criteria**: 
    - Only users with the "SuperManager" role can make updates.
    - Role assignments must be validated for both user IDs and roles.  

- [FE-13] Implement a role assignment form in the admin panel.  
- [FE-14] Handle backend call responses and notify the user of results.  
- [BE-12] Create a POST `/auth/roles/assign` endpoint.  
- [BE-13] Validate the `user_id` and `role_name` fields server-side.  

---

#### **User Story 8 – Manager Retrieves Paginated User List**
**As a Manager, I want to retrieve a paginated list of users, so that I can manage user data efficiently.**  

**Acceptance Criteria & Tasks**  
- **Acceptance Criteria**: 
    - Paginated tables implement "Previous" and "Next" navigation.
    - Filter/sorting parameters should be supported.

- [FE-15] Create pagination buttons in the user list UI.  
- [FE-16] Call backend endpoints dynamically on page changes.  
- [BE-14] Implement pagination logic in `GET /manager/users`.  

---

#### **User Story 9 – Manager Views User Enrollment**
**As a Manager, I want to view all courses and statuses for a specific user, so that I can track their academic progress.**  

**Acceptance Criteria & Tasks**  
- [FE-17] Create a course list for the selected user with basic enrollment details.  
- [BE-15] Build `GET /manager/users/:id/enrollments` with status filtering.  

---

#### **User Story 10 – Manager Enrolls User to a Course**
**As a Manager, I want to enroll a user in a course, so that I can manage their schedule as needed.**  

**Acceptance Criteria & Tasks**  
- [FE-18] Implement form-based enrollment for Managers.  
- [BE-16] Handle enrollment requests via `POST /manager/users/:id/enrollments`.  

---

#### **User Story 11 – Manager Removes User Enrollment**
**As a Manager, I want to remove a user from a course, so that unnecessary enrollments can be cleaned up.**  

**Acceptance Criteria & Tasks**  
- [FE-19] Add a "Remove Enrollment" button to user details/bulk management pages.  
- [BE-17] Write logic for `DELETE /manager/users/:id/enrollments/:course_id`.  

---
