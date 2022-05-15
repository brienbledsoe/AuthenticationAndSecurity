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
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');


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
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
})

userSchema.plugin(passportLocalMongoose);
//Remember that to use a plugin, in order for it to have a plug in, it has to be a mongoose
//schema, it will not work for a standard JS object
//This is what we're going to use to hash and salt our passwords
//and to save our uses into our MongoDB database
//it's going to do a lot of heavy lifting for us

userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());//creating local login strategy here

passport.serializeUser(function(user, done) {
  // replacing previous passport.serialize and .deserialize code for local authentication,
  // and replacing it with code that will work for any kind of authentication (Will not work for local log in or register if passport.use(User.createStrategy()  is not included above))
  // process.nextTick(function() {
  //   cb(null, { id: user.id, username: user.username, name: user.displayName });
  // });
  //replaced cb callback parameter with done
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});





//Configuring passport-local-oauth20 package
//Important that we place configuration code here after all the setup and session save etc.
passport.use(new GoogleStrategy({
  //All the options for the google strategy to log in our user
  //In this case we're telling our app to use passport to authenticate our user, using the
  //Google strategy
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
    // userProfileURL: "https://www.googleapis.com/oatuh2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log("User profile that is returned: ", profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      if(!err){
        return cb(err, user);
        // findOrCreate is actually not actually a function, the developers of passport are basically trying to tell
        // you to implement this type of function. However somebody actually created this function as a package in
        // npm called mongoose-findorcreate(which as you guess it we are going to use)
      }else{
        console.log(err);
      }

    });
  }
));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_APP_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_APP_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
  function(accessToken, refreshToken, profile,cb){
    // console.log("Facebook User profile: ", profile);
    User.findOrCreate({ facebookId: profile.id}, function(err,user){
      return cb(err,user);
    });
  }
));


app.get("/", function(req,res){
  res.render('home');
});

app.get("/auth/google",
  //Creating path for signup and authentication through Google
  // telling google that when used we want the user's profile (which includes email and userID)
  //which we will use to identify them in the future
  passport.authenticate('google', { scope: ['profile'] })

);


app.get("/auth/facebook",
  // passport.authenticate('facebook', {scope: ['public_profile']})
  passport.authenticate('facebook', {scope: ['public_profile']}),

);



app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect('/secrets');
  });


app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', {failureRedirect: '/login'}),
  function(req,res){
    //Successful authentication, redirect to secrets
    res.redirect('/secrets')
  }
);


app.get("/login", function(req,res){
  res.render('login');
});

app.get("/register", function(req,res){
  res.render('register');
});

app.get("/secrets", function(req,res){
  // If the user is already logged in, then we should render the secrets page. But if they're not logged in,
  // then we're going to redirect them to the login page
  //Now we need to render all the users who have a secret posted on the secrets page
  User.find({"secret": {$ne:null}}, function(err, foundUsers){ //check to find the users who's secret field is "Not equal to null"
    if(err){
      console.log(err);
    }else{
      res.render("secrets", {usersWithSecrets: foundUsers});
    }
  }); //Now we have to update secrets.ejs file to pull the usersWithSecrets array and display them using ejs tags

});

app.get("/submit", function(req,res){
  //Need to check to see if the user is logged in
  //Passport actually saves the user's details, because when we initiate a new login session
  //it will save that users details into the request variable
  if(req.isAuthenticated()){
    console.log("Is authenticated boolean: ", req.isAuthenticated())
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});

app.post("/submit", function(req,res){
  const submittedSecret = req.body.secret;
  //How do we know who the current user is?
  //Passport actually saves the user's details, because when we initiate a new login session
  //it will save that users details into the request variable
  console.log("User details: ", req.user);//Now we can find the user using the details we havve available about the user
  console.log("User id: ", req.user.id); //Once we've found the user by identifying their ID we're going to add the secret they submitted to the secret field we added in the schema
  User.findById(req.user.id, function(err, foundUser){//Tapping into User Model (collection)
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){//Saving the submitted secret to the found user's secret field
          res.redirect('/secrets');//once the save is complete we will redirect them to the secrets page
          //so that they can see their own secret, along with everybody elses
        });
      }
    }
  });

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
