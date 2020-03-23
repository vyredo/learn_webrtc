import {uSocket, uApp } from '../nanoexpress'
import * as uWS from 'uWebSockets.js';
import * as Joi from 'joi';
import { readFile, readFileSync } from 'fs';
const indexHTML = readFileSync(__dirname + '/../template/index.html', 'utf-8');


const port = 9001;
let listenSocket:null | string = null;
let shutdown = false;

const _app = uWS.App({
    key_file_name: 'misc/key.pem',
    cert_file_name: 'misc/cert.pem',
    passphrase: '1234'
})



const app = uApp(_app);
const socket = uSocket(_app, {
    compression: 0,
    maxPayloadLength: 16 * 1024 * 1024,
    // idleTimeout: 10,
});

declare type ActionData = {author: string, message: string, room: string}
declare type ActionMessage = {type: 'send', data: ActionData}
declare type ActionSignal = {type: 'signal', data: {messageType: "user_here" | "SDP", message:string}}
declare type JoinMessage = {type: 'ready', data: {chat_room: string, signal_room: string }};
declare type ActionICD = { type: "ice_candidate", data: { message: {candidate: string}, room: string}};

socket
.route('/room')
.Apply((req, action: JoinMessage | ActionMessage , isBinary, ws) => {
  console.log("room", action)
  switch(action.type){
    case "ready":
      ws.publish({type: "announce", data: "I join the room: " + ws.id});
    break;
    case "send":
      ws.publish({type: "message", data: {
        message: (action.data as ActionData).message,
        author: (action.data as ActionData).author
      }});
    break;
    
    default:
      console.log("NOT part of action", action)
  }  
})

socket
.route("/signal")
.Apply((req, action: JoinMessage | ActionSignal | ActionICD, isBinary, ws) => {
  if(!action){
    console.log("/signal", action)

    console.log(req, action, ws);
    return 
  }
  switch(action.type){
    case "ready":
      ws.publish({type: "announce_signal", data: "I join the room: " + ws.id});
    break;
    case "signal":
      ws.broadcast({
        type: "signaling_message", data: {
          id: ws.id,
          messageType: action.data.messageType,
          message: action.data.message
        }
      });
    break;

    case "ice_candidate":
      console.log(action.data.message.candidate)
      ws.broadcast({
        type: "signaling_message", data: {
          id: ws.id,
          // @ts-ignore
          messageType: action.data.messageType,
          message: action.data.message
        }
      });
    break;
  }
})

app.useExpress('/', (req, res) => {
    res.end(indexHTML)
})

app.listen(port , (token:string) => {
    /* Save the listen socket for later shut down */
    listenSocket = token;
    /* Did we even manage to listen? */
    if (token) {
      console.log('Listening to port ' + port);
  
      /* Stop listening soon */
      if(shutdown){
        setTimeout(() => {
          console.log('Shutting down now');
          if(listenSocket){
            uWS.us_listen_socket_close(listenSocket);
            listenSocket = null;
          }
        }, 1000);
      }
      process.on('uncaughtException', function(err){
        console.error(err);
        // setTimeout(() => {
        //   console.log('Shutting down now');
        //   if(listenSocket){
        //     uWS.us_listen_socket_close(listenSocket);
        //     listenSocket = null;
        //   }
        // }, 1000);
      })
    } else {
      console.log('Failed to listen to port ' + port);
    }

  });