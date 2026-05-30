const mongoose = require("mongoose");
const Schema = mongoose.Schema;



const listingSchema = new Schema({
    title : {
        type: String,
        required : true, 
    },

    description : String,
    image : {
        filename: String,
        url: {
            type: String,
            default: "https://images.unsplash.com/photo-1494522358652-a67e08f8f9a5?auto=format&fit=crop&w=800&q=60",
            set: (v) => v === "" ? "https://images.unsplash.com/photo-1494522358652-a67e08f8f9a5?auto=format&fit=crop&w=800&q=60" : v
        }
    },
    price : Number,
    location: String,
country : String,
});

const Listing = mongoose.model("Listing" , listingSchema);
module.exports = Listing; 