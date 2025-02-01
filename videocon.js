const socket = io("https://noisy-roomy-periodical.glitch.me");

let myID = null;        // Our own socket ID
let remoteId = null;    // The chosen peer’s socket ID for the current call
let isReady = false;

const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // TURN server configuration (if needed)
  ],
});

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

let localStream = null;

async function setupLocalStream() {
  if (localStream) return localStream;
  try {
    const constraints = { video: true, audio: true };
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    localVideo.srcObject = localStream;

    // Add tracks to the RTCPeerConnection
    localStream.getTracks().forEach((track) => {
      console.log("Adding track:", track);
      peerConnection.addTrack(track, localStream);
    });
    return localStream;
  } catch (error) {
    console.error("Error accessing camera/microphone:", error);
  }
}

peerConnection.ontrack = (event) => {
  console.log("Receiving remote stream...");
  remoteVideo.srcObject = event.streams[0];
};

peerConnection.onicecandidate = (event) => {
  if (event.candidate && remoteId) {
    console.log("Sending ICE candidate:", event.candidate);
    socket.emit("send", {
      type: "ice-candidate",
      data: event.candidate,
      target: remoteId,
    });
  }
};

// Start call (create offer)
async function startCall() {
  await setupLocalStream();

  // Retrieve target id from the select box.
  const targetId = document.getElementById("userSelect").value;
  if (!targetId) {
    console.error("No target selected");
    return;
  }
  // Save the target as remoteId.
  remoteId = targetId;

  // Create and send the offer.
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("send", {
    type: "offer",
    data: offer,
    target: targetId,
    from: myID, // include caller id so the receiver knows where to answer
  });
}

// Handle incoming signaling messages
socket.on("notification", async (msg) => {
  if (msg.type === "offer") {
    // When receiving an offer, save the sender’s id as remoteId.
    remoteId = msg.from;
    await setupLocalStream();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.data));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    // Send answer back to the caller.
    socket.emit("send", {
      type: "answer",
      data: answer,
      target: msg.from,
    });
  } else if (msg.type === "answer") {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.data));
  } else if (msg.type === "ice-candidate") {
    try {
      console.log("Adding ICE candidate:", msg.data);
      await peerConnection.addIceCandidate(new RTCIceCandidate(msg.data));
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }
});

// Get your own socket id.
socket.on("yourID", (id) => {
  myID = id;
  console.log("My socket ID:", myID);
});

// Update the list of available users.
socket.on("update-user-list", (users) => {
  // Populate the select element with the list.
  const select = document.getElementById("userSelect");
  select.innerHTML = "";
  // (Optionally, filter out your own ID here.)
  users.forEach((userId) => {
    if (userId === myID) return;
    const option = document.createElement("option");
    option.value = userId;
    option.text = userId;
    select.appendChild(option);
  });
});

function ready() {
  if (isReady) socket.disconnect();
  socket.emit("ready");
  isReady = true;
}
