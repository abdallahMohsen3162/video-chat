<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WebRTC Video Chat</title>
  <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script> <!-- Load Socket.io client -->
</head>
<body>
  
  <h2>WebRTC Video Chat</h2>
  <video id="localVideo" autoplay playsinline></video>
  <video id="remoteVideo" autoplay playsinline></video>

  <button onclick="startCall()">Start Call</button>

  <script src="videocon.js"></script> <!-- External WebRTC script -->

</body>
</html>
