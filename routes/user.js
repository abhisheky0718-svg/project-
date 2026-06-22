const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");
const userController = require("../controllers/user.js");

// Render and handle the signup form flow
router.route("/signup")
    .get(userController.renderSignupForm)
    .post(wrapAsync(userController.signup));

// Render and handle the login form flow.
// Uses passport.authenticate middleware to authenticate credentials.
router.route("/login")
    .get(userController.renderLoginForm)
    .post(
        saveRedirectUrl, // Middleware to save the url the user was trying to access before login
        passport.authenticate("local", {
            failureRedirect: "/login",
            failureFlash: true
        }),
        userController.login
    );

// Handle the user logout flow
router.get("/logout", userController.logout);

module.exports = router;  