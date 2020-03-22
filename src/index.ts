import {uSocket, uApp } from '../nanoexpress'
import * as uWS from 'uWebSockets.js';
import * as Joi from 'joi';
import { readFile, readFileSync } from 'fs';


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

socket
.route('/room')
.Apply((req, message, isBinary, ws) => {
  ws.broadcast('New Client in the' + req.data + ' room.');
})


const indexHTML = readFileSync(__dirname + '/../template/index.html', 'utf-8');
console.log(indexHTML)
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
        setTimeout(() => {
          console.log('Shutting down now');
          if(listenSocket){
            uWS.us_listen_socket_close(listenSocket);
            listenSocket = null;
          }
        }, 1000);
      })
    } else {
      console.log('Failed to listen to port ' + port);
    }

  });