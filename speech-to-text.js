window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();
var audioInput = null,
    realAudioInput = null,
    inputPoint = null,
    audioRecorder = null;
var rafID = null;
var analyserContext = null;
var canvasWidth, canvasHeight;
var recIndex = 0;
var socket=io.connect('https://speech.mroads.com');
var stopFlag;
var request;
function saveAudio() {
    audioRecorder.exportMonoWAV( doneEncoding );
}
function gotBuffers( buffers ) {
    audioRecorder.exportMonoWAV( doneEncoding );
}
socket.on('interimData',function(msg){
   console.log(msg);
   var textDiv=document.getElementById("convertedText");   
   if(textDiv){
      textDiv.innerHTML=msg;
   }else{
      console.log("speech to text div not available for display")
   }		
});
socket.on('completed',function(text){
       var data={
         sentence1:'JDK is java development kit and JRE is java runtime environment',
         sentence2:text
      }
      var http = new XMLHttpRequest();
      var url = "https://ai.mroads.com/descriptive-evaluation/getSimialarityScore";
      http.open("POST", url, true);
      http.setRequestHeader("Content-type", "application/json");
      http.onreadystatechange = function() {
     if(http.readyState == 4 && http.status == 200) {
        response=http.responseText;
        console.log("Response:"+response);
        if(response){
          responseobj=JSON.parse(response);
          similarity_score=responseobj.score;
          console.log('similarity_score:'+similarity_score);
          var scoreDiv=document.getElementById('score'); 
	 if(scoreDiv)
           scoreDiv.innerHTML='Confidence Score:'+similarity_score;
        }
     }
   }
   http.send(JSON.stringify(data));
});
function doneEncoding( blob ) {
	console.log("done encoding suitable for converting text");
    var filename="recording" + ((recIndex<10)?"0":"") + recIndex + ".wav";
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    console.log(blob);
    console.log(request);
    socket.emit('start',blob,request);
    recIndex++;
    startSpeechToText(request);
}
function setSpeechToText(flag){
	console.log(flag);
	stopflag=flag;
}
function startSpeechToText(speechToTextRequest){
	console.log("inside start speech to text");
	request=speechToTextRequest;
    audioRecorder.clear();
    audioRecorder.record();
    setTimeout(function(){
    if(stopflag){
        audioRecorder.stop();
        audioRecorder.getBuffers(gotBuffers);      
     }
   },3000);
}
function stopSpeechToText(speechToTextRequest){
  console.log("inside stopSpeechToText");
  setSpeechToText(false);
  socket.emit('stop',speechToTextRequest);
}
function convertToMono( input ) {
    var splitter = audioContext.createChannelSplitter(2);
    var merger = audioContext.createChannelMerger(2);
    input.connect( splitter );
    splitter.connect( merger, 0, 0 );
    splitter.connect( merger, 0, 1 );
    return merger;
}
function toggleMono() {
    if (audioInput != realAudioInput) {
        audioInput.disconnect();
        realAudioInput.disconnect();
        audioInput = realAudioInput;
    } else {
        realAudioInput.disconnect();
        audioInput = convertToMono( realAudioInput );
    }

    audioInput.connect(inputPoint);
}
function initSpeechToText(stream) {
    inputPoint = audioContext.createGain();
    realAudioInput = audioContext.createMediaStreamSource(stream);
    audioInput = realAudioInput;
    audioInput.connect(inputPoint);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    inputPoint.connect( analyserNode );
    audioRecorder = new Recorder( inputPoint );
    zeroGain = audioContext.createGain();
    zeroGain.gain.value = 0.0;
    inputPoint.connect( zeroGain );
    zeroGain.connect( audioContext.destination );
}
