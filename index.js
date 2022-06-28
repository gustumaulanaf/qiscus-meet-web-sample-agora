import AgoraRTC from "agora-rtc-sdk-ng";

let remoteContainer= document.getElementById("remote-container");
let baseUrl = "https://agora-meet-server.herokuapp.com/api";
let baseUrl2 = "https://api.agora.io/v1/apps";
let token = "";
let sid = "";
let rid="";
var uid = "";
function addVideoContainer(uid){
    document.getElementById("rid").innerText = "SEDANG DITAMBAHKAN"+uid;
    let streamDiv=document.createElement("div"); // Create a new div for every stream
    streamDiv.id=uid;                       // Assigning id to div
    streamDiv.style.transform="rotateY(180deg)"; // Takes care of lateral inversion (mirror image)
    remoteContainer.appendChild(streamDiv);      // Add new div to container
}
/**
 * @name removeVideoContainer
 * @param uid - uid of the user
 * @description Helper function to remove the video stream from "remote-container"
 */
function removeVideoContainer (uid) {
    let remDiv=document.getElementById(uid);
    remDiv && remDiv.parentNode.removeChild(remDiv);
}

async function getToken(channelName, uid){
    let  mBody = JSON.stringify({
        "channel_name":channelName,
        "role":"client",
        "token_type":"uid",
        "uid":uid
    });
   let request = await fetch(`${baseUrl}/conference/rtc`, {
        method: "post",
        headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "Accept": "application/json",
        },
        body: mBody
    }).then((response) => response.json());
    let result =JSON.parse(JSON.stringify(request));
    return result.data.rtc_token;
};

document.getElementById("start").onclick = async function () {
   
    // Client Setup
    // Defines a client for RTC
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "h264" });
    // Get credentials from the form
    let appId = document.getElementById("app-id").value;
    let channelId = document.getElementById("channel").value;
    token = await getToken(channelId,"0");
    // Create local tracks
    const [localAudioTrack, localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    document.getElementById("token").value = token;
    // Initialize the stop button
    initStop(client, localAudioTrack, localVideoTrack);
    
    // Play the local track
    localVideoTrack.play('me');

    // Set up event listeners for remote users publishing or unpublishing tracks
    client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType); // subscribe when a user publishes
        document.getElementById("rid").innerText = "SEDANG DITAMBAHKAN"+user.uid;

        if (mediaType === "video") {
          addVideoContainer(String(user.uid)) // uses helper method to add a container for the videoTrack
          user.videoTrack.play(String(user.uid));
        }
        if (mediaType === "audio") {
          user.audioTrack.play(); // audio does not need a DOM element
        }
    });
    client.on("user-unpublished",  async (user, mediaType) => {
        if (mediaType === "video") {
            removeVideoContainer(user.uid) // removes the injected container
        }
    });
    document.getElementById("startRecording").disabled = false;
    setInterval(() => {
        client.getRTCStats((stats) => {
        document.getElementById("timer").innerText = stats.Duration;

        });
      }, 1000) 
    // Join a channnel and retrieve the uid for local user
    const _uid = await client.join(appId, channelId, token, null); 
    document.getElementById("uid").value = _uid;
    uid = _uid;
    await client.publish([localAudioTrack, localVideoTrack]);

};

function initStop(client, localAudioTrack, localVideoTrack){
    const stopBtn = document.getElementById('stop');
    stopBtn.disabled = false; // Enable the stop button
    stopBtn.onclick = null; // Remove any previous event listener
    stopBtn.onclick = function () {
        client.unpublish(); // stops sending audio & video to agora
        localVideoTrack.stop(); // stops video track and removes the player from DOM
        localVideoTrack.close(); // Releases the resource
        localAudioTrack.stop();  // stops audio track
        localAudioTrack.close(); // Releases the resource
        client.remoteUsers.forEach(user => {
            if (user.hasVideo) {
                removeVideoContainer(user.uid) // Clean up DOM
            }
            client.unsubscribe(user); // unsubscribe from the user
        });
        client.removeAllListeners(); // Clean up the client object to avoid memory leaks
        stopBtn.disabled = true;
    }
}
document.getElementById("startRecording").onclick = async function () {
  
    let appId = document.getElementById("app-id").value;
    let channelId = document.getElementById("channel").value;
    callBody = JSON.stringify(
        {
            "channel_name": channelId,
            "uid": `${uid}`,
            "rtc_token":token,
            "mode": "mix"
          }
        
    )
    startRecording = await fetch(`${baseUrl}/recording/start`, {
        method: "post",
        headers: {
            "Content-Type": "application/json; charset=UTF-8",
            Accept: "application/json"      },
        body: callBody
    }).then((response) => response.json());
    result = JSON.parse(JSON.stringify(startRecording));
    sid = result.data.s_id;
    rid = result.data.resource_id;
    document.getElementById("rid").innerHTML = "MEREKAM"+sid;
    initStopRecording(callBody);
    document.getElementById("startRecording").disabled = true;
};

function initStopRecording(body) {
    const stopBtn = document.getElementById("stopRecording");
    stopBtn.disabled = false;
    stopBtn.onclick = null;
    stopBtn.onclick = async function () {
        stopcall = await fetch(`${baseUrl}/recording/stop`, {
            method: "post",
            headers: {
                "Content-Type":"application/json; charset=UTF-8",
                "Accept": "application/json",
            },
            body: body,
        }).then((response) => response.json());
        stopBtn.disabled = true;
    document.getElementById("rid").innerHTML = "BERHENTI";
        document.getElementById("startRecording").disabled = false;
    };
}

