import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// import database
import { courses, enrollments, students } from "../db/db.ts";
import { zCourseId, zEnrollmentBody } from "../libs/zodValidators.ts";
import type { Enrollment, Student } from "../libs/types.ts";
// import database
import type { User, CustomRequest, UserPayload } from "../libs/types.ts";
import { users, reset_users } from "../db/db.ts";
import { authenticateToken } from "../middlewares/authenMiddleware.ts";
import { checkRoleAdmin } from "../middlewares/checkRoleMiddleware.ts";
// create a new router
const router = Router();

// GET enrollments
router.get("/", authenticateToken, (req: CustomRequest, res: Response) => {
  try {
    //const courseNo = req.query.courseNo;
    //const studentId = req.query.studentId;
    const user = req.user;
    if (!user) {
      return res.status(403).json({
        ok: "false",
        message: "Invalid UserName or Password",
      });
    }

    if (user.role !== "ADMIN") {
      const studentEnrollData = enrollments.filter(
        (studentID) => studentID.studentId === user.studentId,
      );
      return res.status(200).json({
        ok: "true",
        role: "student",
        enrollments: studentEnrollData,
      });
    }
    return res.status(200).json({
      ok: true,
      role: "ADMIN",
      enrollments: enrollments,
    });
  } catch (err) {
    return res.json({
      success: false,
      message: "Something is wrong, please try again",
      error: err,
    });
  }
});

// POST /api/v2/enrollments
router.post(
  "/",
  authenticateToken,
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(403).json({
          ok: "false",
          message: "Invalid UserName or Password",
        });
      }
      if (user.role === "ADMIN") {
        return res.status(403).json({
          ok: true,
          message: "Only STUDENT can access this API route",
        });
      }

      const body = (await req.body) as Enrollment;
      // validate req.body with predefined validator
      const result = zEnrollmentBody.safeParse(body);
      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      //check duplicate
      const found = enrollments.find(
        (studentID) =>
          studentID.studentId === body.studentId &&
          studentID.courseId === body.courseId,
      );
      if (found) {
        return res.status(409).json({
          success: false,
          message: "Enrollment is already exists",
        });
      }

      // add new enrollment
      const new_enrollment = body;
      enrollments.push(new_enrollment);
      return res.status(200).json({
        ok: true,
        message: "Enroll Success!!",
      });
    } catch (err) {
      return res.json({
        success: false,
        message: "Somthing is wrong, please try again",
        error: err,
      });
    }
  },
);

// DELETE /students, body = {studentId}
router.delete("/", authenticateToken, (req: CustomRequest, res: Response) => {
  try {
    const user = req.user;
    const delBody = req.body;

    if (!user) {
      return res.status(403).json({
        ok: "false",
        message: "Invalid UserName or Password",
      });
    }
    if (user.role === "ADMIN") {
      return res.status(403).json({
        ok: true,
        message: "Only STUDENT can access this API route",
      });
    }
    const found = enrollments.findIndex(
      (enroll) =>
        enroll.courseId === delBody.courseNo &&
        enroll.studentId === user.studentId,
    );
    if (found === -1) {
      return res.status(404).json({
        ok: false,
        message: "You have not enrolled in this course",
      });
    }

    enrollments.splice(found, 1);
    return res.status(200).json({
      ok: true,
      message: "You has dropped from this course. See you next semester.",
    });
  } catch (err) {
    return res.json({
      success: false,
      message: "Somthing is wrong, please try again",
      error: err,
    });
  }
});

export default router;