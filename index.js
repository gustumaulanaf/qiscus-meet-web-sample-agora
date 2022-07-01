import AgoraRTC from "agora-rtc-sdk-ng";

let remoteContainer= document.getElementById("remote-container");
let baseUrl = "https://agora-meet-server.herokuapp.com/api";
let token = "";
let sid = "";
let rid="";
var uid = "";
function addVideoContainer(uid){
    let streamDiv=document.createElement("div"); 
    streamDiv.id=uid;            
    streamDiv.style.transform="rotateY(180deg)"; 
    remoteContainer.appendChild(streamDiv);     
}

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
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "h264" });
    let appId = document.getElementById("app-id").value;
    let channelId = document.getElementById("channel").value;
    token = await getToken(channelId,"0");
    const [localAudioTrack, localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    document.getElementById("token").value = token;
    initStop(client, localAudioTrack, localVideoTrack);
    localVideoTrack.play('me');

    client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType); 
        document.getElementById("rid").innerText = "SEDANG DITAMBAHKAN"+user.uid;

        if (mediaType === "video") {
          addVideoContainer(String(user.uid)) 
          user.videoTrack.play(String(user.uid));
        }
        if (mediaType === "audio") {
          user.audioTrack.play();
        }
    });
    client.on("user-unpublished",  async (user, mediaType) => {
        if (mediaType === "video") {
            removeVideoContainer(user.uid);
        }
    });
    document.getElementById("startRecording").disabled = false;
    setInterval(() => {
        client.getRTCStats((stats) => {
        document.getElementById("timer").innerText = stats.Duration;

        });
      }, 1000) 
    const _uid = await client.join(appId, channelId, token, null); 
    document.getElementById("uid").value = _uid;
    uid = _uid;
    await client.publish([localAudioTrack, localVideoTrack]);
};

function initStop(client, localAudioTrack, localVideoTrack){
    const stopBtn = document.getElementById('stop');
    stopBtn.disabled = false; 
    stopBtn.onclick = null;
    stopBtn.onclick = function () {
        client.unpublish(); 
        localVideoTrack.stop();
        localVideoTrack.close(); 
        localAudioTrack.stop();  
        localAudioTrack.close(); 
        client.remoteUsers.forEach(user => {
            if (user.hasVideo) {
                removeVideoContainer(user.uid) 
            }
            client.unsubscribe(user); 
        });
        client.removeAllListeners(); 
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

