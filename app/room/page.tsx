'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Peer from 'simple-peer';
import { database } from '../../lib/firebaseConfig';
import {
  ref,
  onValue,
  set,
  remove,
  push,
  DataSnapshot,
} from 'firebase/database';

export default function RoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const company = searchParams.get('company');

  const [isMatched, setIsMatched] = useState(false);

  const myVideo = useRef<HTMLVideoElement>(null);
  const partnerVideo = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer.Instance>();
  const signalsRef = useRef<any>();

  useEffect(() => {
    if (!company) return;

    const roomRef = ref(database, `rooms/${company}`);

    // Check if room exists
    onValue(roomRef, (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        // Room exists, join as second participant
        joinRoom(false, roomRef);
      } else {
        // Create room and wait for partner
        set(roomRef, { created: true }).then(() => {
          joinRoom(true, roomRef);
        });
      }
    });

    return () => {
      if (signalsRef.current) {
        remove(signalsRef.current);
      }
    };
  }, [company]);

  const joinRoom = async (initiator: boolean, roomRef: any) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (myVideo.current) {
        myVideo.current.srcObject = stream;
      }

      const peer = new Peer({
        initiator: initiator,
        trickle: false,
        stream: stream,
      });

      peer.on('signal', (signalData) => {
        const signalsRef = ref(database, `rooms/${company}/signals`);
        const newSignalRef = push(signalsRef);
        set(newSignalRef, {
          signal: signalData,
          initiator: initiator,
        });
      });

      peer.on('stream', (streamData) => {
        if (partnerVideo.current) {
          partnerVideo.current.srcObject = streamData;
        }
      });

      peerRef.current = peer;

      // Listen for signals from the database
      signalsRef.current = ref(database, `rooms/${company}/signals`);
      onValue(signalsRef.current, (snapshot: DataSnapshot) => {
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          if (data.initiator !== initiator) {
            peer.signal(data.signal);
            setIsMatched(true);
          }
        });
      });
    } catch (error) {
      console.error('Error accessing media devices.', error);
    }
  };

  return (
    <div className="flex flex-col items-center h-screen bg-gray-100">
      {!isMatched ? (
        <h2 className="text-2xl font-bold mt-10">Waiting for a partner...</h2>
      ) : (
        <div className="flex flex-col items-center mt-10">
          <h2 className="text-2xl font-bold mb-4">Interview in Progress</h2>
          <div className="flex space-x-4">
            <video
              playsInline
              muted
              ref={myVideo}
              autoPlay
              className="w-64 h-48 bg-black"
            />
            <video
              playsInline
              ref={partnerVideo}
              autoPlay
              className="w-64 h-48 bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}