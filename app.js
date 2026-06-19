if(process.env.NODE_ENV !== "production"){
require('dotenv').config();
}



const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dns = require('dns');
const path = require("path"); 
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate"); 
const ExpressError = require("./utils/ExpressError.js"); 
const {listingSchema , reviewSchema}= require("./schema.js");
const Review = require("./models/review.js");
const session = require("express-session");
const MongoStore = require("connect-mongo").default || require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy  = require("passport-local");
const User = require("./models/user.js"); 

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const dbUrl = process.env.ATLASDB_URL ;

// Force Node DNS to use reliable public resolvers so SRV lookups work in restricted networks
try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
    console.log("DNS servers set to 8.8.8.8 and 1.1.1.1 for SRV resolution");
} catch (e) {
    console.warn("Could not set DNS servers:", e.message);
}

if (!process.env.ATLASDB_URL) {
    console.warn("Warning: ATLASDB_URL is not set. Falling back to local MongoDB at mongodb://127.0.0.1:27017/wanderlust");
}

app.set("view engine" , "ejs");
app.set("views" , path.join(__dirname, "views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine('ejs' , ejsMate);
app.use(express.static(path.join(__dirname , "/public")));

const secret = process.env.SECRET || "thisshouldbeabettersecret!";


const store = MongoStore.create({
    mongoUrl : dbUrl,
    crypto : {
        secret:secret,
    },
    touchAfter : 24 *3600,
});

store.on("error", (err) => {
    console.log("ERROR IN MONGO SESSION STORE", err);
});
const sessionOptions = {
    store,
    secret: secret, 
    resave : false, 
    saveUninitialized:true, 
    cookie : {
expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
maxAge : 7*24*60*60*1000,
httpOnly : true,    
    },
};


// app.get("/" ,( req , res)=>{
//     res.send("HEY Welcome you are here");
// });

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate())); 

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser()); 

app.use((req , res ,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// app.get("/demouser", async(req,res, next)=>{
//     try {
//         let fakeUser = new User ({
//             email :"abhiyadav@gmail.com",
//             username :"Abhishek"
//         });
//         let registeredUser = await User.register(fakeUser , "helloworld");
//         res.send(registeredUser);
//     } catch(err) {
//         next(err); // passes the error to your custom error handler
//     }
// });

 



app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/" , userRouter);

app.use((req, res, next) => {
    next(new ExpressError(404, "Page not found"));
});

app.use((err , req , res , next)=>{
    let { statusCode =500,message ="something went wrong" }= err;
    res.status(statusCode).render("error.ejs", { message, err });
});

async function main() {
    try {
        // Try Atlas connection first
        if (process.env.ATLASDB_URL) {
            console.log("Attempting to connect to MongoDB Atlas...");
            await mongoose.connect(process.env.ATLASDB_URL);
        } else {
            // Fallback to local MongoDB
            console.log("No Atlas URL provided. Using local MongoDB...");
            await mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");
        }
    } catch (atlasErr) {
        console.warn("Atlas connection failed:", atlasErr.message);
        if (process.env.ATLASDB_URL) {
            console.error("ATLASDB_URL was provided; aborting startup because Atlas connection failed.");
            throw atlasErr;
        }
        console.log("Falling back to local MongoDB at mongodb://127.0.0.1:27017/wanderlust");
        try {
            await mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");
        } catch (localErr) {
            console.error("Local MongoDB also failed. Ensure MongoDB is running locally.");
            throw localErr;
        }
    }
}

main()
    .then(() => {
        const port = process.env.PORT || 5000;
        console.log("connected to db");
        app.listen(port, () => {
            console.log(`server is listening at port ${port}`);
        });
    }).catch((err) => {
        console.log("DB connection error:", err);
    });