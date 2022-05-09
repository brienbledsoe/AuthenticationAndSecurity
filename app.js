//jshint esversion:6
require('dotenv').config(); //Important that you put this line right at the top of the file because
//otherwise if you try to use an enviornment variable and its not configured then you won't be able
//to access it
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const {Schema} = mongoose;
const bcrypt = require('bcrypt');
const saltRounds = 10; //npm docunmentation shows amount of time saltrounds could take to hash
//the higher the number, the longer it takes for your computer to hash



const app = express();


// console.log(process.env.log.SECRET);

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

  bcrypt.hash(req.body.password, saltRounds, function(err,hash){
    const newUser = new User({
      email: req.body.username,
      password: hash
    });

    newUser.save(function(err){
      if(err){
        console.log(err);
      }else{
        res.render('secrets');
      }
    })
  });


});


app.post('/login', function(req,res){
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({email: username}, function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        bcrypt.compare(req.body.password, foundUser.password, function(err, result) {
          if(result === true){
            // result == true
            res.render("secrets");
          }else{
            console.log(err);
          }

        });
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
