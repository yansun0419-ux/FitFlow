package routes

import (
	"my-course-backend/api"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// SetupRouter initializes the Gin engine and defines all routes
func SetupRouter() *gin.Engine {
	r := gin.Default()
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true // For development only!
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	r.Use(cors.New(config))

	// -----------------
	// Auth
	authRoutes := r.Group("/auth")
	{
		authRoutes.POST("/register", api.Register)
		authRoutes.POST("/manager/invite-codes", api.CreateManagerInviteCode)
		authRoutes.POST("/manager/register", api.ManagerRegister)
		authRoutes.POST("/login", api.Login)
		authRoutes.GET("/profile", api.GetProfile)
		authRoutes.PUT("/profile", api.UpdateProfile)
		authRoutes.POST("/roles/assign", api.AssignUserRole)
	}
	// Users
	userRoutes := r.Group("/users")
	{
		userRoutes.DELETE("/:id", api.DeleteUser)
		userRoutes.GET("/:id/enrollments", api.GetUserEnrolledClasses)
		userRoutes.GET("/:id/analytics", api.GetUserAnalytics)
	}
	// Classes
	classRoutes := r.Group("/classes")
	{
		classRoutes.GET("", api.ListClasses)
		classRoutes.GET("/categories", api.ListCategories)
		classRoutes.GET("/:id", api.GetClass)
		classRoutes.GET("/:id/enrollments", api.ListClassEnrollments)
		classRoutes.POST("/register", api.RegisterClass)
		classRoutes.POST("/drop", api.DropClass)
		classRoutes.POST("", api.ManagerCreateClass)
		classRoutes.PUT("/:id", api.ManagerUpdateClass)
		classRoutes.DELETE("/:id", api.ManagerDeleteClass)
	}

	// Instructor (核心调整)
	instructorRoutes := r.Group("/instructor")
	{
		instructorRoutes.GET("/courses", api.InstructorListCourses)
		instructorRoutes.GET("/courses/:id/enrollments", api.InstructorListCourseEnrollments)
		instructorRoutes.POST("/courses/:id/enrollments", api.InstructorAddUserEnrollment) // 只留一个POST实现
		instructorRoutes.PATCH("/courses/:id/enrollments", api.InstructorUpdateEnrollmentStatus)
		instructorRoutes.DELETE("/courses/:id/enrollments/:user_id", api.InstructorDeleteUserEnrollment) // 建议 :user_id
	}

	// Manager
	managerRoutes := r.Group("/manager")
	{
		managerRoutes.GET("/users", api.ManagerListUsers)
		managerRoutes.GET("/users/:id/enrollments", api.ManagerListUserEnrollments)
	}

	return r
}