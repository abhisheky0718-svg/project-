# Wanderlust Project - Interview Preparation Guide

This guide is designed to help you explain your web application, **Wanderlust**, to a technical interviewer. It details the architecture, technologies used, database schemas, security flow, cloud integrations, and contains sample questions they might ask.

---

## 1. Project Overview & Tech Stack
**Wanderlust** is a full-stack lodging/travel rental web application (similar to Airbnb) built using the **MEN stack** (MongoDB, Express, Node.js) with server-side rendering.

*   **Frontend**: HTML5, CSS3, Bootstrap (for responsive design), EJS (Embedded JavaScript) with `ejs-mate` for layout boilerplates.
*   **Backend**: Node.js & Express.js (RESTful routing, middleware-based request pipeline).
*   **Database**: MongoDB Atlas (Cloud NoSQL database) with Mongoose (ODM - Object Document Mapper).
*   **Authentication & Session**: `passport` & `passport-local` with `passport-local-mongoose` for secure session-based authentication.
*   **Validation**: `joi` for server-side schema validation (independent of MongoDB/Mongoose).
*   **Cloud Storage**: Cloudinary (integrated via `multer` and `multer-storage-cloudinary`) for image uploads.

---

## 2. Project Architecture (MVC Pattern)
The project strictly adheres to the **Model-View-Controller (MVC)** design pattern to ensure clean separation of concerns:

1.  **Models (`/models`)**: Defines the Mongoose schemas representing the data structures (Users, Listings, Reviews) and interaction rules with MongoDB.
2.  **Views (`/views`)**: EJS template files rendered on the server to generate dynamic HTML returned to the browser.
3.  **Controllers (`/controllers`)**: Holds the business logic. Routes intercept requests and hand them over to controller functions, which process data, interact with models, and render views or redirect.
4.  **Routes (`/routes`)**: Maps HTTP methods and endpoint paths (URLs) to their respective controller handlers. Organized logically by resource (listing routes, review routes, user routes).

---

## 3. Database Schema & Relationships

### Collections & Schema Fields
*   **User Schema**: Managed primarily by `passport-local-mongoose`. It stores the user's `email`, and passport-local-mongoose automatically hashes and salts passwords using PBKDF2, saving them as `hash` and `salt` fields alongside a unique `username`.
*   **Review Schema**: Stores a `comment` (String), `rating` (Number: 1-5), `createdAt` (Date), and an `author` reference (`Schema.Types.ObjectId` pointing to the `User` collection).
*   **Listing Schema**: Contains properties like `title`, `description`, `price`, `location`, `country`, and an `image` object (`url` and `filename`).
    *   **Relationships**:
        *   **One-to-Many**: A listing can have multiple reviews. This is implemented by storing an array of ObjectIds in the `reviews` field pointing to the `Review` collection.
        *   **One-to-One Owner**: A listing has one owner. This is stored in the `owner` field pointing to the `User` collection.

### Cascade Delete Middleware (Mongoose Hook)
When a listing is deleted, its associated reviews must not become orphaned in the database. In `models/listing.js`, a post-hook is used:
```javascript
listingSchema.post("findOneAndDelete" , async(listing)=>{
    if(listing){
        await Review.deleteMany({_id : {$in : listing.reviews}});
    }   
});
```
*   *Talking Point*: "I implemented a Mongoose post-query hook (`findOneAndDelete`) so that deleting a listing automatically triggers a cascade delete of all reviews associated with that listing, keeping database records clean."

---

## 4. Key Implementation Flows

### A. Authentication & Session-Based Flow
1.  **Session Setup**: Express uses `express-session` backed by `connect-mongo`. Instead of using local server memory (which leaks and resets on app restart), session IDs and data are stored inside MongoDB Atlas.
2.  **Passport Local**:
    *   `passport.initialize()` and `passport.session()` are mounted as middlewares.
    *   Users sign up/login, and Passport creates a cookie storing the encrypted session ID.
    *   `passport.serializeUser` determines what user data is saved in the session (typically the user ID).
    *   `passport.deserializeUser` retrieves the full user object from the database using that ID on subsequent requests, attaching it to `req.user`.

### B. Authorization & Protecting Routes (Middlewares)
*   **`isLoggedIn`**: Intercepts requests to make sure `req.isAuthenticated()` is true. If false, it stores the url the user was trying to access in `req.session.redirectUrl` so they can be sent back there after login.
*   **`isOwner`**: Fetching the listing from MongoDB and checking if `listing.owner.equals(req.user._id)`. If they match, the request proceeds (`next()`), otherwise they are blocked and redirected with a flash error.
*   **`isReviewAuthor`**: Follows the same principle to prevent users from deleting reviews written by others.

### C. Server-side Schema Validation (Joi)
*   Instead of waiting for database writes to fail due to schema mismatches, we run Joi schema validations (`schema.js`) in custom middlewares (`validateListing`, `validateReview`) before writing to the database.
*   *Talking Point*: "We validate the input format at the controller entrypoint using Joi. If someone sends malformed data (like negative prices or missing fields) via a tool like Postman, Joi intercepts it immediately and throws a 400 Bad Request before hitting our database."

### D. File & Cloud Uploads (Multer + Cloudinary)
1.  Form data containing files is sent as `multipart/form-data`.
2.  `multer` intercepts the file in the route: `upload.single('listing[image]')`.
3.  `multer-storage-cloudinary` uploads the file directly to Cloudinary and returns a secure image URL and unique filename.
4.  The controller extracts `req.file.path` (the URL) and `req.file.filename` and saves them in Mongoose.
5.  *Cloud Cleanup*: In the listing controller's delete action, we call `cloudinary.uploader.destroy(deletedListing.image.filename)` to clean up the image file from Cloudinary.

---

## 5. Potential Interview Questions & How to Answer

### Q: Why did you use MongoDB over a Relational Database like PostgreSQL?
*   *Answer*: "For a lodging application like Wanderlust, listings can have variable attributes and unstructured text, making the flexible schema of MongoDB ideal. Furthermore, using MongoDB Atlas allows the application to scale horizontally easily, and Mongoose provides powerful ODM features like model referencing and query population that simplify development."

### Q: How did you implement user authentication and keep it secure?
*   *Answer*: "I integrated Passport.js using the local strategy. I used `passport-local-mongoose` on my User model, which handles salting and hashing of passwords using PBKDF2 under the hood. For sessions, I configured `connect-mongo` so that active sessions are persisted in the cloud database instead of volatile server memory, which ensures users stay logged in even if the server restarts."

### Q: How does image upload work, and how do you handle deleting images?
*   *Answer*: "I configured Multer with a Cloudinary storage engine. In the POST and PUT listing routes, Multer uploads the image directly to Cloudinary. In my controllers, I store the resulting Cloudinary URL and filename. When a listing is deleted, I fetch the filename from the database and call `cloudinary.uploader.destroy()` to remove the image from the cloud, preventing orphaned assets."

### Q: What is the purpose of `wrapAsync` in your routes?
*   *Answer*: "In Express, unhandled asynchronous errors can crash the server or hang requests. `wrapAsync` is a helper function that catches any rejected promises/errors thrown inside an async controller and forwards them to Express's global error-handling middleware via `next(err)`. This keeps the code clean by removing the need for repetitive `try-catch` blocks in every controller."

### Q: How did you prepare this application for deployment on Render?
*   *Answer*: 
    1.  Configured the application to run on a dynamic port (`process.env.PORT || 5000`).
    2.  Set up production-safe session persistence using `connect-mongo` pointing to MongoDB Atlas.
    3.  Created a clean `.gitignore` to keep API credentials and local `.env` files secure.
    4.  Set the engine version in `package.json` to a stable LTS Node.js range (`>=20.0.0`) to match Render's build specifications.
