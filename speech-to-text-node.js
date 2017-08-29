/*
	Author: Karthik
	Date: 07/05/2017
*/
'use strict';
var app = require('express')();
var s = require('stream');
var socket,currentstream;
var audiostream = new s.Readable();
var neo4j = require('neo4j-driver').v1;
var nodeuri='bolt://neo4j.mroads.com:7687';
var driver = neo4j.driver(nodeuri, neo4j.auth.basic('neo4j','mRo@ds123'));
var session = driver.session();
var fs = require('fs');
var https = require('https');
var privatekey=fs.readFileSync('/root/SSL/certificates/panna.mroads.com.key','utf8');
var certificate = fs.readFileSync('/root/SSL/certificates/945f2621d6ed7960.crt','utf8');
var credentials={key:privatekey,cert:certificate};
var express = require('express');
var app = express();
var httpsServer = https.createServer(credentials, app).listen(11000,function(){
   console.log("https server started in port:11000");
});
var io=require('socket.io')(httpsServer);

var  Speech = require('@google-cloud/speech');
var  request = {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 44100,
      languageCode: 'en-IN'
    }
};
var users=[];
app.get('/', function(req, res){
  res.sendFile(__dirname + '/demo.html');
});
app.get('/recorder', function(req, res){
  res.sendFile(__dirname + '/recorder.js');
});
app.get('/recorderWorker', function(req, res){
  res.sendFile(__dirname + '/recorderWorker.js');
});
app.get('/speech-to-text', function(req, res){
  res.sendFile(__dirname + '/speech-to-text.js');
});
app.all('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
 });
io.sockets.on('connection', function(socket){
  console.log('connection established');
  socket.on('start', function(stream,datafromClient){
    try{  
    console.log("Inside start data recieved is:");
    console.log(datafromClient);
    var text="",flag=0,userInstance;
    for(var i=0;i<users.length;i++){
      if(users[i].interviewId==datafromClient.interviewId&&users[i].questionId==datafromClient.questionId){
          userInstance=users[i];
          flag=1;
      }
    }
    if(flag==0){
      userInstance={
        interviewId:datafromClient.interviewId,
        questionId:datafromClient.questionId,
        text:""
      }
      users.push(userInstance);
    }
    currentstream = new s.Readable();
    currentstream.push(stream);
    currentstream.push(null);
    var speech = Speech();
    var recognizeStream=speech.createRecognizeStream(request)
    .on('error',function(error){
      console.log("Speech to text Coversion error");
      console.error(error);
    })
    .on('data', function(data){
      userInstance.text+=data.results+" ";
      console.log(userInstance.text); 
      socket.emit('interimData',userInstance.text)
    })
    currentstream.pipe(recognizeStream);
   }catch(e){
    console.log("exception is:");
    console.log(e);
   } 
  })
  socket.on('stop',function(datafromClient){
  try{
    console.log("Inside stop data recieved is:");
    console.log(datafromClient);
    var userInstance;
    for(var i=0;i<users.length;i++){
      if(users[i].interviewId==datafromClient.interviewId&&users[i].questionId==datafromClient.questionId){
          userInstance=users[i];
      }
    }
   socket.emit('completed',userInstance.text);
   var resultPromise = session.run('create(n:speechToText{interviewId:$interviewId,questionId:$questionId,text:$text}) return n',{interviewId:userInstance.interviewId,questionId:userInstance.questionId,text:userInstance.text});
   resultPromise.then(result => {
     const singleRecord = result.records[0];
     const node = singleRecord.get(0);
     console.log(node.properties);
    });
  }catch(e){
    console.log("exception is:");
    console.log(e);
   } 
  })  
});
