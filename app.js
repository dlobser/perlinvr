var express = require('express');
var app = express();
var ejs = require('ejs');
//var app = require('http').createServer(handler);
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var port = process.env.PORT || 8000 ;

var clients = [];


// Set up the view directory
app.set("views", __dirname);

// Set EJS as templating language WITH html as an extension)
app.engine('.html', ejs.__express);
app.set('view engine', 'html');

app.use(express.static(__dirname + '/script'));


app.get('/',function(req,res){

    res.render('index.html');

});

// function handler (req, res) {
//   fs.readFile(__dirname + '/index.html',
//   function (err, data) {
//     if (err) {
//       res.writeHead(500);
//       return res.end('Error loading index.html');
//     }

//     res.writeHead(200);
//     res.end(data);
//   });
// }

io.on('connection', function (socket) {
  
  var send_msg = {
    id:socket.id,
    info: 'helloWorld'
  };

  socket.on('Hey', function (data) {
    console.log(data);
  });

  console.log("Hello world, I am - "+ socket.id);

  clients.push(socket.id);


  socket.on('socketInfo',function(data){
    socket.broadcast.emit(data);
  });

});


io.on('disconnect', function (socket) {
  

  console.log("bye world - "+ socket.id);

  socket.emit('disconnect', { bye: 'world' });
  
  for (var i = 0; i < clients.length; i++) {
    if (clients[i] == socket.id) {
      clients.splice(i,1);
    }
  }


});


http.listen(8000);