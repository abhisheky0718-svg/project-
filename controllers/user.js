/**
 * User Controller
 * Part of the MVC architecture.
 * This controller handles authentication actions: rendering forms, signing up users, 
 * logging in, and logging out.
 */

const User = require("../models/user.js");

/**
 * Controller: Render Signup Form
 * GET /signup
 */
module.exports.renderSignupForm = (req, res) => {
    res.render("user/signup.ejs");
};

/**
 * Controller: Register a new user
 * POST /signup
 */
module.exports.signup = async (req, res, next) => {
    try {
        let { username, email, password } = req.body;
        const newUser = new User({ email, username });
        // passport-local-mongoose registers user and automatically hashes/salts password
        const registeredUser = await User.register(newUser, password);
        console.log(registeredUser);
        
        // Log in the user immediately after successful registration
        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to Dream Land");
            res.redirect("/listings");
        });
    } catch (err) {
        req.flash("error", err.message);
        res.redirect("/signup");   
    }
};

/**
 * Controller: Render Login Form
 * GET /login
 */
module.exports.renderLoginForm = (req, res) => {
    res.render("user/login.ejs");
};

/**
 * Controller: Log in a user
 * POST /login
 */
module.exports.login = async (req, res) => {
    req.flash("success", "You are logged in");
    // Redirect to the URL the user attempted to access before login, or default to listings page
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl); 
};

/**
 * Controller: Log out a user
 * GET /logout
 */
module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "You are logged out!");
        res.redirect("/listings");
    });
};    