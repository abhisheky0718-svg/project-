const Listing = require("../models/listing");
const Review = require ("../models/review")
const ExpressError = require("../utils/ExpressError.js");

module.exports.createReview = async(req, res)=>{
    let listing = await Listing.findById(req.params.id);
    if(!listing){
      throw new ExpressError(404, "Listing not found");
    }
    let newReview = new Review(req.body.review);
newReview.author = req.user._id;
console.log(newReview);
 
    await newReview.save();
    listing.reviews.push(newReview._id);
    await listing.save();
    req.flash("success" ,"New review created!");
    res.redirect(`/listings/${listing._id}`);
 };
 module.exports.destroyReview = async (req,res)=>{
        let {id,reviewId} = req.params;

        await Review.findByIdAndDelete(reviewId);
        await Listing.findByIdAndUpdate(id , {$pull:{reviews:reviewId}});
          req.flash("success" ,"review Deleted !");
        res.redirect(`/listings/${id}`);
    };