if(process.env.NODE_ENV !== "production"){
require('dotenv').config();
}
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dns = require("dns");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const dbUrl = process.env.ATLASDB_URL;


app.set("view engine" , "ejs");
app.set("views" , path.join(__dirname, "views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine('ejs' , ejsMate);
app.use(express.static(path.join(__dirname , "/public")));

const secret = process.env.SECRET || "thisshouldbeabettersecret!";

if (!dbUrl) {
    console.error("Missing ATLASDB_URL environment variable. Set it to your MongoDB Atlas connection string.");
    process.exit(1);
}

const MongoStore = require("connect-mongo");

let store;
try {
    store = MongoStore.create({
        mongoUrl: dbUrl,
        crypto: { secret },
        touchAfter: 24 * 3600,
    });

    store.on("error", (err) => {
        console.error("Mongo session store error:", err);
    });
} catch (err) {
    console.error("Failed to create Mongo session store:", err);
    process.exit(1);
}


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

function getAtlasUri() {
    if (!dbUrl) return null;
    if (dbUrl.startsWith("mongodb+srv://")) return dbUrl;
    return dbUrl;
}

async function connectDb() {
    const uri = getAtlasUri();
    await mongoose.connect(uri, {
        autoIndex: false,
        family: 4,
        serverSelectionTimeoutMS: 10000,
    });
}

async function resolveSrvIfNeeded() {
    if (!dbUrl || !dbUrl.startsWith("mongodb+srv://")) return;
    const parsed = new URL(dbUrl);
    const host = parsed.hostname;
    const srvName = `_mongodb._tcp.${host}`;
    try {
        await dns.promises.resolveSrv(srvName);
        return;
    } catch (err) {
        console.warn("Default SRV resolve failed:", err.code || err.message);
        const resolver = new dns.Resolver();
        resolver.setServers(["8.8.8.8"]);
        const addresses = await resolver.resolveSrv(srvName);
        console.log("Public DNS SRV resolved with addresses:", addresses.map(a => a.name).join(", "));
        return addresses;
    }
}

(async () => {
    try {
        await resolveSrvIfNeeded();
        await connectDb();
        const port = process.env.PORT || 5000;
        console.log("Connected to MongoDB Atlas");
        app.listen(port, () => {
            console.log(`Server is listening on port ${port}`);
        });
    } catch (err) {
        console.error("Failed to connect to MongoDB Atlas:", err);
        process.exit(1);
    }
})();
