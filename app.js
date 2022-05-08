//jshint esversion:6
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const {Schema} = mongoose;

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended:true}));

app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/userDB", function(err){
  if(err){
    console.log(err);
  }
});

const userSchema = new Schema ({
    email: String,
    password: String
})

const secret = "Thisisourlittlesecret"

userSchema.plugin(encrypt, {secret: secret, encryptedFields : ['password']}); //important that we add this plugin to the schema before we
//create our mongoose model. This plugin will encrypt the entire database
//the secret key is what we're using to encrypt our password (the convenient way from documentation)
// You may or may not want this to happen to you database, because later on when the user logs
// in, we're going to have to search through our database, to find their email address. Its best if we only
// encrypt the password field, and leave  the email field unencrypted

const User = mongoose.model('User', userSchema);



app.get("/", function(req,res){
  res.render('home');
});

app.get("/login", function(req,res){
  res.render('login');
});

app.get("/register", function(req,res){
  res.render('register');
});

app.post("/register", function(req,res){
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });

  newUser.save(function(err){
    if(err){
      console.log(err);
    }else{
      res.render('secrets');
    }
  })

})


app.post('/login', function(req,res){
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({email: username}, function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        if(foundUser.password === password){
          res.render('secrets');
        }
      }
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
