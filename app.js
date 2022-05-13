//jshint esversion:6
require('dotenv').config(); //Important that you put this line right at the top of the file because
//otherwise if you try to use an enviornment variable and its not configured then you won't be able
//to access it
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const {Schema} = mongoose;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');


const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));



//app.set('trust proxy', 1)//if my app.js file was functioning behind a proxy, like my ford laptop
//I would have to use this line of code

 app.use(session({
   secret: "Please don't decode this secret key!",
   resave: false,
   saveUninitialized: true
   // cookie: {secure: true}
 }));//setting up our session (Initializing our session with the options we included)

 app.use(passport.initialize()); //using initialize() method that comes bundled so that we can
 //Here we are instructing our app to use passport and to initilize the package

 //TELLING OUR APP TO USE PASSPORT TO SETUP/MANAGE OUR SESSION
 app.use(passport.session()); //Be sure to check out Passport.js documentation to see why Angela is using
 //these selected lines of code (especially under the configure session)





mongoose.connect("mongodb://localhost:27017/userDB", function(err){
  if(err){
    console.log(err);
  }
});


const userSchema = new Schema ({
    email: String,
    password: String
})

userSchema.plugin(passportLocalMongoose);
//Remember that to use a plugin, in order for it to have a plug in, it has to be a mongoose
//schema, it will not work for a standard JS object
//This is what we're going to use to hash and salt our passwords
//and to save our uses into our MongoDB database
//it's going to do a lot of heavy lifting for us

const User = mongoose.model('User', userSchema);

// //Configure Passport-local configuration in the passport-local-mongoose package
// const User = require('./models/user'); Didn't need this line

//Following code needs to go below the line where we created our User mongoose.modeL()/COLLECTION
// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());//creating local login strategy here

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.get("/", function(req,res){
  res.render('home');
});

app.get("/login", function(req,res){
  res.render('login');
});

app.get("/register", function(req,res){
  res.render('register');
});

app.get("/secrets", function(req,res){
  // If the user is already logged in, then we should render the secrets page. But if they're not logged in,
  // then we're going to redirect them to the login page
  if(req.isAuthenticated()){
    console.log("Is authenticated boolean: ", req.isAuthenticated())
    res.render("secrets");
  }else{
    res.redirect("/login");
  }

});

app.get("/logout", function(req,res){
  //Essentially de-authenticate our user and end the user session here
  req.logout();
  res.redirect("/"); 
})

app.post("/register", function(req,res){

  //this method .register(), comes from passport-local-mongoose package. Its because of this package that we
  // can avoid creating our new user, saving our new user, and interacting with Mongoose directly
  // instead, we're going to use this package as our middle man to handle all the communication for us
  User.register({username: req.body.username, active:false}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      console.log("Inside register else condition.");
      // console.log(passport.authenticate("local")(req,res,function(){res.redirect("/secrets")}));
      passport.authenticate("local")(req,res,function(){
          //Callback is only triggered when the authentication was successful and we managed to successfully
          //setup a cookie that saved their current logged in session
          res.redirect('/secrets');
          // Now notice previously we never had a secrets route res.render("/secrets"), because we always
          // relied on res.rendering the secrets page either through register or login. In this case because
          // we're authenticating our user and setting up a logged in session for them, then even if they just
          // go directly to the secrets page, they should automatically be able to view it if they are in fact
          // still logged in. Thats why we still need to create our secrets route!  app.get("/secrets", function(req,res))
        })

    }
  })

});


app.post('/login', function(req,res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  //Using passport to login and authenticate userDB
  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      //User has successfully logged in
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      })
    }
  })

});






app.listen(3000, function(err){
  if(!err){
    console.log("Server running on Port 3000. Local development active.");
  }else{
    console.log(err);
  }
})
