const socket = io("https://ballistic-hip-value.glitch.me"); // Signaling server

// WebRTC configuration with TURN servers
const peerConnection = new RTCPeerConnection({
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        // TURN server configuration (if needed)
    ]
});

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

// Store the local stream globally so that it is only set up once
let localStream = null;

// Get local video/audio with proper mobile support
async function setupLocalStream() {
    if (localStream) return localStream; // Already set up

    try {
        const constraints = { video: true, audio: true };
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        localVideo.srcObject = localStream;

        // Add tracks to the RTCPeerConnection
        localStream.getTracks().forEach(track => {
            console.log("Adding track:", track);
            peerConnection.addTrack(track, localStream);
        });

        return localStream;
    } catch (error) {
        console.error("Error accessing camera/microphone:", error);
    }
}

// Handle incoming remote stream
peerConnection.ontrack = (event) => {
    console.log("Receiving remote stream...");
    remoteVideo.srcObject = event.streams[0];
};

// Handle ICE candidates (connection negotiation)
peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        console.log("Sending ICE candidate:", event.candidate);
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

// Handle incoming signaling messages
socket.on("notification", async(msg) => {
    if (msg.type === "offer") {
        // Set up local stream if it hasn't been already (avoid adding tracks twice)
        await setupLocalStream();

        // Set the remote description with the incoming offer
        await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.data));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit("send", { type: "answer", data: answer });
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