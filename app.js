/**
 * Dream Land Web Application - Main Entrypoint (app.js)
 * This file configures the Express application, sets up middleware, 
 * configures session storage with MongoDB, handles Passport authentication, 
 * mounts routes, and initializes the database connection.
 */

// 1. Environment Configurations
// Only load dotenv local variables in non-production environments.
if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

// 2. DNS Workaround for Node.js
// Fixes potential IPv6 resolution issues with MongoDB Atlas on local environments.
const dns = require('dns');
dns.setDefaultResultOrder && dns.setDefaultResultOrder('ipv4first');
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
    console.warn("Failed to set DNS servers:", err.message);
}

// 3. Module Imports
const express = require("express");
const app = express();
app.set("trust proxy", 1); // Trust reverse proxy headers (e.g. Render, Heroku) for HTTPS redirect URL generation
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo").default || require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

// 4. Route Imports
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

// 5. Database Connection String Config
const dbUrl = process.env.ATLASDB_URL;
const secret = process.env.SECRET || "thisshouldbeabettersecret!";

if (!dbUrl) {
    console.error("Missing ATLASDB_URL environment variable. Set it to your MongoDB Atlas connection string.");
}

// 6. View Engine and Middleware Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method")); // Allows PUT and DELETE requests from HTML forms
app.engine('ejs', ejsMate); // Use ejs-mate for layout templating (boilerplates)
app.use(express.static(path.join(__dirname, "/public"))); // Serve static files (CSS/JS)

// 7. Configure MongoDB Session Store
// Sessions are stored in the Atlas database instead of default server memory (prevents leaks).
let store;
try {
    store = MongoStore.create({
        mongoUrl: dbUrl,
        ttl: 14 * 24 * 60 * 60, // Session lifespan: 14 days
        autoRemove: "native",
        crypto: {
            secret: secret,
        },
    });

    store.on("error", (err) => {
        console.error("Mongo session store error:", err);
    });
} catch (err) {
    console.error("Failed to create Mongo session store (continuing without it):", err);
    store = undefined;
}

// 8. Session & Flash Middleware Configurations
const sessionOptions = {
    ...(store ? { store } : {}),
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true, // Enhances security (stops XSS from reading session ID)
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    },
};

app.use(session(sessionOptions));
app.use(flash()); // Flash messaging for success/error alerts

// 9. Passport Authentication Setup
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate())); // Uses passport-local for username/password authentication

// Google OAuth 2.0 Strategy Configuration
const GoogleStrategy = require("passport-google-oauth20").Strategy;
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || "MOCK_CLIENT_ID",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "MOCK_CLIENT_SECRET",
    callbackURL: "/auth/google/callback",
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
        if (!email) {
            return done(new Error("No email associated with this Google Account."));
        }
        
        let user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            const baseUsername = profile.displayName.replace(/\s+/g, "").toLowerCase();
            const randomSuffix = Math.floor(100 + Math.random() * 900);
            const username = baseUsername + randomSuffix;
            
            user = new User({ email: email.toLowerCase().trim(), username });
            await User.register(user, Math.random().toString(36).substring(2)); // Register with random local password
        }
        return done(null, user);
    } catch (err) {
        return done(err);
    }
  }
));

// Configure serialization (saving user details to session) and deserialization
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser()); 

// 10. Local Variables Middleware
// Injects success, error flash messages, current logged-in user, and activeCategory query to EJS templates.
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    res.locals.activeCategory = req.query.category || "";
    next();
});

// 11. Route Mounting
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

// 12. 404 Route Handler
app.use((req, res, next) => {
    next(new ExpressError(404, "Page not found"));
});

// 13. Global Error Handling Middleware
// Automatically catches errors thrown from any of the wrapAsync controllers.
app.use((err, req, res, next) => {
    let { statusCode = 500, message = "something went wrong" } = err;
    res.status(statusCode).render("error.ejs", { message, err });
});

// 14. Database Connection and Server Startup
async function connectDb() {
    await mongoose.connect(dbUrl, {
        autoIndex: false,
        serverSelectionTimeoutMS: 10000,
    });
}

(async () => {
    try {
        if (!dbUrl) throw new Error("Missing ATLASDB_URL");

        await connectDb();
        console.log("Connected to MongoDB Atlas");
    } catch (err) {
        console.error("Mongo not connected yet:", err);
    }

    const port = process.env.PORT || 5000;
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`);
    });
})();


