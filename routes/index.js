const express = require("express");
const router = express.Router();
const multer = require("multer");
const { UserController, CommentController } = require("../controllers");
const authentificateToken = require("../middleware/auth");
const PostController = require("../controllers/post-controller");

const uploadDestination = "uploads";

// Defining storage destination
const storage = multer.diskStorage({
  destination: uploadDestination,
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const uploads = multer({ storage: storage });

// User routes
router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.get("/current", authentificateToken, UserController.current);
router.get("/users/:id", authentificateToken, UserController.getUserById);
router.put("/users/:id", authentificateToken, UserController.updateUser);

// Post routes
router.post("/posts", authentificateToken, PostController.createPost);
router.get("/posts", authentificateToken, PostController.getAllPosts);
router.get("/posts/:id", authentificateToken, PostController.getPostById);
router.delete("/posts/:id", authentificateToken, PostController.deletePost);

// Comment routes
router.post("/comments", authentificateToken, CommentController.createComment);
router.delete(
  "/comments/:id",
  authentificateToken,
  CommentController.deleteComment,
);

module.exports = router;
