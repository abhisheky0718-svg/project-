const express = require("express");

const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path"); 
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate"); 
const wrapAsync = require("./utils/wrapAsync.js"); 
const ExpressError = require("./utils/ExpressError.js"); 


const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";



main()
.then(()=>{
    console.log("connected to db");
}).catch((err)=>{
    console.log(err);
});
  
async function main(){
    await mongoose.connect(MONGO_URL);

}
app.set("view engine" , "ejs");
app.set("views" , path.join(__dirname, "views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine('ejs' , ejsMate);
app.use(express.static(path.join(__dirname , "/public")));

app.get("/" ,( req , res)=>{
    res.send("HEY Welcome you are here");
});
 // index  route 
app.get("/listings" ,async (req, res, next)=>{
  try {
    const allListings = await Listing.find({});
    res.render("listings/index", { allListings });
  } catch (err) {
    next(err); // Passes the error to Express's default error handler
  }
});  
// new route
 app.get("/listings/new" , (req ,res)=>{
    res.render("listings/new")
 });

// show route
app.get("/listings/:id" , wrapAsync(async(req,res)=>{
    let {id} = req.params;
    const listing = await Listing.findById(id);
    if(!listing){
        throw new ExpressError(404, "Listing not found!");
    }
    res.render("listings/show" , {listing});
}));

// create route
app.post("/listings",
      wrapAsync(async (req ,res , next)=>{
    if (!req.body.listing){
        throw new ExpressError(400, "send valid data for request")
    }
    const newListing = new Listing(req.body.listing)
    await newListing.save();
    res.redirect("/listings");
})
);

// edit route
app.get("/listings/:id/edit" , wrapAsync(async(req , res)=>{
    let {id} = req.params;
    const listing = await Listing.findById(id);
    if(!listing){
        throw new ExpressError(404, "Listing not found!");
    }
    res.render("listings/edit" , {listing});
}));

// update route
app.put("/listings/:id" , wrapAsync(async(req , res)=>{
    if (!req.body.listing){
        throw new ExpressError(400, "send valid data for request")
    }
    let {id} = req.params;
    await Listing.findByIdAndUpdate(id, {...req.body.listing});
    res.redirect(`/listings/${id}`);
}));
// delete route
app.delete("/listings/:id" , wrapAsync(async(req , res)=>{
        let {id} = req.params;
        let deletedListing = await Listing.findByIdAndDelete(id);
        console.log(deletedListing);
        res.redirect("/listings");
}));

// app.get("/testListing" , async(req ,res) =>{
//     let samplelisting = new Listing ({
//         title : "MY New villa" ,
//         description :"By the beach", 
//         price : 1200,
//         location : "calangute , Goa",  
//         country : " india",

//     });
//      await samplelisting.save();
//      console.log("sample was saved");
//      res.send("successfull testing");
// });
app.all("*" , (req , res ,next)=>{
    next(new ExpressError(404 , "Page not found"));  
});   

app.use((err , req , res , next)=>{
    let { statusCode =500,message ="something went wrong" }= err;
    res.status(statusCode).render("error.ejs", { message });
})
app.listen(5000 , ()=>{
    console.log("server is listening at port 5000 "); 
});  