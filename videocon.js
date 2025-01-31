const socket = io("https://ballistic-hip-value.glitch.me"); // Connect to the signaling server

// Create WebRTC connection
const peerConnection = new RTCPeerConnection();
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

// Get local video/audio
async function setupLocalStream() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = stream;

        // Add tracks to the WebRTC connection
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    } catch (error) {
        console.error("Error accessing camera/microphone:", error);
    }
}

// Handle incoming remote stream
peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
};

// Handle ICE candidates
peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        socket.emit("send", { type: "ice-candidate", data: event.candidate });
    }
};

// Start call (create offer)
async function startCall() {
    await setupLocalStream();
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("send", { type: "offer", data: offer });
}

// Handle incoming messages from Socket.io
socket.on("notification", async (msg) => {
    if (msg.type === "offer") {
        await setupLocalStream();
        
        await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.data));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit("send", { type: "answer", data: answer });
    } 
    
    else if (msg.type === "answer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.data));
    } 
    
    else if (msg.type === "ice-candidate") {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(msg.data));
        } catch (error) {
            console.error("Error adding ICE candidate:", error);
        }
    }
});
