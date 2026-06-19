
const Listing = require("../models/listing");
const { cloudinary } = require("../cloudConfig.js");
const ExpressError = require("../utils/ExpressError.js");


module.exports.index =async (req, res, next)=>{
    const allListings = await Listing.find({});
    res.render("listings/index", { allListings });
}



module.exports.renderNewForm = (req ,res)=>{
  res.render("listings/new")
 };


 module.exports.showlisting = async(req,res)=>{
     let {id} = req.params;
     const listing = await Listing.findById(id)
     .populate({path :"reviews" ,
        populate :{
       path : "author" , 
     },
   })
     .populate("owner");
     if(!listing){
       req.flash("error" , "Listing not found!");
       return res.redirect("/listings");
     }
     console.log(listing);
     res.render("listings/show" , {listing})
 };


module.exports.createListing = async (req ,res , next)=>{

const newListing = new Listing(req.body.listing);
     newListing.owner = req.user._id;
  
  console.log("createListing - req.body.listing:", req.body.listing);
  console.log("createListing - req.file:", req.file);

  if (req.file) {
    let url = req.file.path;
    let filename = req.file.filename;
    newListing.image = { url, filename };
  }
  
     await newListing.save();
     console.log("createListing - saved listing:", newListing);
     req.flash("success" ," new listing created !");
     res.redirect("/listings");
 };

 module.exports.renderEditForm = async(req , res)=>{
      let {id} = req.params;
      const listing = await Listing.findById(id);
      if(!listing){
          throw new ExpressError(404, "Listing not found!");
      }
    let originalImageUrl = "";
    if (listing.image && listing.image.url) {
      originalImageUrl = listing.image.url.replace("/upload", "/upload/h_300,w_250");
    }
      res.render("listings/edit" , {listing , originalImageUrl});
  };

module.exports.updateListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }

  listing.set(req.body.listing);

  if (req.file) {
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename };
  }
  await listing.save();
  req.flash("success", "Listing updated!");
  res.redirect(`/listings/${id}`);
};

   module.exports.destroyListing = async(req , res)=>{
         let {id} = req.params;
         let deletedListing = await Listing.findByIdAndDelete(id);
         console.log(deletedListing);

         if (deletedListing.image && deletedListing.image.filename) {
             await cloudinary.uploader.destroy(deletedListing.image.filename);
         }

           req.flash("success" ,"  listing Deleted!");
           res.redirect("/listings");
 };