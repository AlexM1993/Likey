if(process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const catchAsync = require("./utils/catchAsync");
const flash = require("connect-flash");
const ExpressError = require("./utils/ExpressError");
const methodOverride = require("method-override");
const Like = require("./models/like");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user");
const { isLoggedIn } = require("./middleware");
const { storeReturnTo } = require('./middleware');
const multer = require("multer");
const { storage } = require("./cloudinary");
const { cloudinary } = require("./cloudinary");
const upload = multer({ storage });


mongoose.connect("mongodb://127.0.0.1/likey");
mongoose.set("strictQuery", false);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error"));
db.once("open", () => {
  console.log("Database connected");
});

const app = express();

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")))

const sessionConfig = {
    secret: "thisshouldbeabettersecret!",
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }

}
app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
})


app.get("/", (req, res) => {
  res.render("home");
});

app.get("/likes", isLoggedIn, catchAsync(async (req, res) => {
  if (!isLoggedIn) {
    res.redirect("/login")
  }
  const likes = await Like.find({});
  res.render("likes/index", { likes });
}));

app.get("/likes/new", isLoggedIn, (req, res) => {
  res.render("likes/new");
});

// app.post("/likes", upload.array("image"), (req, res) => {
//   console.log(req.body, req.files)
//   res.send("IT WORKED!")
// })

app.post("/likes", isLoggedIn, upload.array("image"), catchAsync(async (req, res, next) => {
    if(!req.body.like) throw new ExpressError("Invalid Likey Data!", 400);
  const like = new Like(req.body.like);
  like.images = req.files.map(f => ({ url: f.path, filename: f.filename }))
  like.author = req.user._id;
  await like.save();
  console.log(like);
  req.flash("success", "Successfully created a Likey!");
  res.redirect(`/likes/${like._id}`)
}));

  
app.get("/likes/:id", catchAsync(async (req, res) => {
  const like = await Like.findById(req.params.id).populate("author");
  if(!like){
    req.flash("error", "Couldn't find your Likey :(")
    return res.redirect("/likes");
  }
  res.render("likes/show", { like });
}));

app.get("/likes/:id/edit", isLoggedIn, catchAsync(async (req, res) => {
  const like = await Like.findById(req.params.id);
  res.render("likes/edit", { like });
}));

app.put("/likes/:id", isLoggedIn, upload.array("image"), catchAsync(async (req, res) => {
  const { id } = req.params;
  console.log(req.body);
  const like = await Like.findByIdAndUpdate(id, { ...req.body.like });
  const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
  like.images.push(...imgs);
  await like.save();
  if (req.body.deleteImages) {
    for(let filename of req.body.deleteImages){
      await cloudinary.uploader.destroy(filename);
    }
    await like.updateOne({$pull: {images: {filename: {$in: req.body.deleteImages }}}})
    console.log(like)
  }
  req.flash("success", "Successfully updated your Likey!")
  res.redirect(`/likes/${like._id}`);
}));

app.delete("/likes/:id", isLoggedIn, catchAsync(async (req, res, next) => {
  const { id } = req.params;
  await Like.findByIdAndDelete(id);
  req.flash("success", "Sucesfully deleted your Likey!");
  res.redirect("/likes");
}));

app.get("/register", (req, res) => {
    res.render("users/register")
})

app.post("/register", catchAsync(async (req, res, next) => {
    try {
    const {email, username, password} = req.body;
    const user = new User({ email, username });
    const registeredUser = await User.register(user, password);
    req.login(registeredUser, err => {
      if(err) return next(err);
      req.flash("success", "Welcome to Likey!");
    res.redirect("/likes");
    })
    } catch(e) {
        req.flash("error", e.message);
        res.redirect("register");
    }

}))

app.get("/login", (req, res) => {
    res.render("users/login");
})

app.post("/login", storeReturnTo, passport.authenticate("local", { failureFlash: true, failureRedirect: "/login" }), (req, res) => {
    req.flash("success", "Welcome back!");
    const redirectUrl = res.locals.returnTo || '/likes';
    delete req.session.returnTo;
    res.redirect(redirectUrl)
})

app.get("/logout", (req, res) => {
    req.logout(function (err) {
      if (err) {
        return next(err);
      }
    req.flash("success", "See you soon!")
    res.redirect("/");
  });
})

app.all("*", (req, res, next) => {
    next(new ExpressError("Page Not Found" , 404))
})


app.use((err, req, res, next) => {
    const { statusCode = 500} = err;
    if(!err.message) err.message = "Oh crap, that didn't work :(";
    res.status(statusCode).render("error", { err })
  })

app.listen(3000, () => {
  console.log("serving on port 3000");
});
