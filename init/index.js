 const mongoose = require("mongoose");
 const initData = require("./data.js");
 const Listing = require("../models/listing.js");

 const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
 
 async function initDB(){
   await Listing.deleteMany({});
   
      await Listing.insertMany(initData.data);
   console.log("data was initialized");
 }

 async function main(){
     await mongoose.connect(MONGO_URL);
     await initDB();
 }

 main()
 .then(()=>{
     console.log("connected to db");
 }).catch((err)=>{
     console.log(err);
 });