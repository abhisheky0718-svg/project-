const Listing = require("./models/listing");
const Review = require("./models/review");
const ExpressError = require("./utils/ExpressError.js"); 
const {listingSchema , reviewSchema }= require("./schema.js");

module.exports.isLoggedIn = (req ,res,next)=>{
     if(! req.isAuthenticated()){
      req.session.redirectUrl = req.originalUrl; 
    req.flash("error", "you must be logged in to create listing !")
     return res.redirect("/login")
  }
  next();
};
module.exports.saveRedirectUrl = (req , res , next)=>{
  if (req.session.redirectUrl){
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};
module.exports.isOwner = async (req , res ,  next)=>{
  let {id} = req.params;
  const listing = await Listing.findById(id);
       if (!listing) {
    req.flash("error", "Cannot find that listing!");
    return res.redirect("/listings");
  }
  if(!req.user || !listing.owner.equals(req.user._id)){
    req.flash("error" , "You don't have permission to do that!");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

const validateSchema = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(',');
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

module.exports.validateListing = validateSchema(listingSchema);
module.exports.validateReview = validateSchema(reviewSchema);

module.exports.isReviewAuthor =async (req , res ,  next)=>{
  let { id , reviewId} = req.params;
  let review = await Review.findById(reviewId);
  // Check if the user is logged in AND if they are the author of the review
  if(!req.user || !review.author.equals(req.user._id)){
    req.flash("error" , "You are not the author of this review!");
    return res.redirect(`/listings/${id}`);
  }
  next();
};