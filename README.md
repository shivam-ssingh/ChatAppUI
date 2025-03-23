# ChatAppUI

https://danielk.tech/home/angular-login-form-with-tailwind-css

https://medium.com/@gabrielbastosdeveloper/real-time-application-development-with-signalr-and-angular-74c7d869afaf

https://damienbod.com/2018/05/13/uploading-and-sending-image-messages-with-asp-net-core-signalr/

## https://medium.com/@tony.infisical/guide-to-nodes-crypto-module-for-encryption-decryption-65c077176980

# Window Crypto APIs

[Youtube Vid of a talk talking about crypto apis.](https://www.youtube.com/watch?v=cZTHGPn1jdU)

_APIs present for crypto.subtle:_
![Crypto APIs](learnings/image.png)

RSA -> Asymmetrical Algorithm.
AES -> Symmetrical Algorithm.

_AES Algorithms and their properties:_
![AES Algorithms ](learnings/AES-Algo.png)

> By Integrity and Authenticity mentioned here, it means if a data is encrypted with AES-GCM, the decryption fails hence offering more security.

//article on import
https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey#pkcs_8

//Reference for an E2EE chat app in angular
https://github.dev/wiringbits/safer.chat/blob/master/web/src/app/components/chat/chat.component.ts

openssl genrsa -out user1-private.pem 2048
openssl rsa -in user1-private.pem -pubout -out user1-public.pem

cp user1-public.pem user1-p /mnt/c/Users/Shivam/keys

## Dockerize Angular

https://dev.to/oneofthedevs/docker-angular-nginx-37e4

https://www.youtube.com/watch?v=-o5l6zFJ9_o

https://github.com/marketplace/actions/render-deploy-action

## Webrtc flow

SignalR connection is established.
A session is created and joined.
WebRTC peer connections are created.
Offer/Answer signaling is exchanged.
ICE candidates are exchanged for NAT traversal.
A WebRTC data channel is created.
Files are transferred in chunks.
The connection is closed when done.

## Encrypting files

https://medium.com/@the.v_hacker/progressive-file-encryption-using-web-crypto-api-44ad9656fcbc

Encryption algo use -> AES-CBC

> it creates an array of objects first(called parts), object being the chunksize(20mb) and the number of the element. then iterating over this array of objects, it slices the file based on the object of the parts array, the sliced chunk is then encrypted.each chunk is encrypted and saved seperately.

This is good for larger files, for now we're going for simpler, we're going for AES-GCM
