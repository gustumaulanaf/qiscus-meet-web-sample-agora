import AgoraRTC from "agora-rtc-sdk-ng";

let remoteContainer= document.getElementById("remote-container");
let baseUrl = "https://api.agora.io/v1/apps";


function addVideoContainer(uid){
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



document.getElementById("start").onclick = async function () {
   
    // Client Setup
    // Defines a client for RTC
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "h264" });
    // Get credentials from the form
    let appId = document.getElementById("app-id").value;
    let channelId = document.getElementById("channel").value;
    let token = document.getElementById("token").value || null;

    // Create local tracks
    const [localAudioTrack, localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    
    // Initialize the stop button
    initStop(client, localAudioTrack, localVideoTrack);
    
    // Play the local track
    localVideoTrack.play('me');

    // Set up event listeners for remote users publishing or unpublishing tracks
    client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType); // subscribe when a user publishes
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
    let uid = document.getElementById("uid").value || null;
	let channelId = document.getElementById("channel").value;
    let url = `${baseUrl}/${appId}/cloud_recording/acquire`;
    let clientID = "626e7c43150741a1884d3e050a43249c";
    let clientSecret = "acbeeb2dc7494d228d7205bc9da68993";
    let body = JSON.stringify({"cname":channelId,"uid":uid,"clientRequest":{}});
    let token = document.getElementById("token").value || null;

    document.getElementById("rid").innerText = body
    var credentials = btoa(clientID+":"+clientSecret);
    acquire = await fetch(`${baseUrl}/${appId}/cloud_recording/acquire`,{
        method:"post",
        headers:{
            "Content-Type":"application/json; charset=UTF-8",
            "Accept": "application/json",
            "Authorization" : `Basic ${credentials}`
        },
        
        body:body
    }).then((response) => response.json());
    result = JSON.parse(JSON.stringify(acquire));
    rid= result.resourceId;
    callBody = JSON.stringify(
        {
            "cname":channelId,
            "uid":uid,
            "clientRequest":{
                "token": token, 
                "recordingConfig":{
                    "channelType":0,
                    "streamTypes":2,
                    "audioProfile":1,
                    "videoStreamType":0,
                    "maxIdleTime":120,
                    "transcodingConfig":{
                        "height": 640,
                        "width": 360,
                        "bitrate": 500,
                        "fps": 15,
                        "mixedVideoLayout":1
                        }
                    },
                "storageConfig":{
                    "vendor":6,
                    "region":0,
                    "bucket":"rnd-team",
                    "accessKey":"GOOG4RJWXAMBEW27HU3E4A2K",
                    "secretKey":"hdXArlSfeuMtp6d7Vu++TK4RLRL39rO8FmU3Pbwn"
                }	
            }
        } 
        
    )
	startcall = await fetch(`${baseUrl}/${appId}/cloud_recording/resourceid/${rid}/mode/mix/start`, {
		method: "post",
		headers: {
			"Content-Type": "application/json; charset=UTF-8",
			Accept: "application/json",
           "Authorization" : `Basic ${credentials}`
		},
		body: callBody
	}).then((response) => response.json());
    result2 = JSON.parse(JSON.stringify(startcall));
    sid = result2.sid;
    document.getElementById("rid").innerHTML = sid;
	initStopRecording(appId,rid,sid,credentials,body);
	document.getElementById("startRecording").disabled = true;
};

function initStopRecording(appid,rid,sid,credentials,body) {
	const stopBtn = document.getElementById("stopRecording");
	stopBtn.disabled = false;
	stopBtn.onclick = null;
	stopBtn.onclick = async function () {
		stopcall = await fetch(`${baseUrl}/${appid}/cloud_recording/resourceid/${rid}/sid/${sid}/mode/mix/stop`, {
			method: "post",
			headers: {
                "Content-Type":"application/json; charset=UTF-8",
                "Accept": "application/json",
                "Authorization" : `Basic ${credentials}`
			},
			body: body,
		}).then((response) => response.json());
		stopBtn.disabled = true;
		document.getElementById("startRecording").disabled = false;
	};
}

function openForm() {
    document.getElementById("myForm").style.display = "block";
  }
  
  function closeForm() {
    document.getElementById("myForm").style.display = "none";
  }