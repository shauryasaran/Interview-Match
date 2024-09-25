'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Peer from 'simple-peer';
import { database } from '../../lib/firebaseConfig';
import {
  ref,
  set,
  push,
  DataSnapshot,
  get,
  onChildAdded,
  off,
} from 'firebase/database';

export default function RoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const company = searchParams.get('company');

  const [isMatched, setIsMatched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myVideo = useRef<HTMLVideoElement>(null);
  const partnerVideo = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer.Instance | null>(null);
  const signalsRef = useRef<any>(null);

  useEffect(() => {
    if (!company) return;

    const roomRef = ref(database, `rooms/${company}`);

    // Determine if the user is the initiator
    get(roomRef).then((snapshot: DataSnapshot) => {
      const isInitiator = !snapshot.exists();

      if (isInitiator) {
        // Create the room
        set(roomRef, { created: true }).then(() => {
          console.log(`Room created: ${company}`);
          joinRoom(true, roomRef);
        });
      } else {
        console.log(`Joining existing room: ${company}`);
        joinRoom(false, roomRef);
      }
    });

    return () => {
      if (signalsRef.current) {
        off(signalsRef.current);
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, [company]);

  const joinRoom = async (initiator: boolean, roomRef: any) => {
    try {
      console.log(`Initiator: ${initiator}`);

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

      peer.on('signal', async (signalData) => {
        console.log('Sending signal:', signalData);
        const signalsRef = ref(database, `rooms/${company}/signals`);
        await push(signalsRef, {
          signal: signalData,
          initiator: initiator,
        });
      });

      peer.on('stream', (streamData) => {
        console.log('Received remote stream');
        if (partnerVideo.current) {
          partnerVideo.current.srcObject = streamData;
        }
      });

      peer.on('connect', () => {
        console.log('Peer connected');
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
        setError('An error occurred with the peer connection.');
      });

      peerRef.current = peer;

      // Listen for new signals from Firebase
      signalsRef.current = ref(database, `rooms/${company}/signals`);

      onChildAdded(signalsRef.current, (snapshot) => {
        const data = snapshot.val();
        console.log('Received signal from Firebase:', data);

        if (data.initiator !== initiator) {
          peer.signal(data.signal);
          if (!isMatched) {
            setIsMatched(true);
            console.log('Connection established with peer');
          }
        }
      });
    } catch (err) {
      console.error('Error accessing media devices.', err);
      setError('Unable to access camera and microphone.');
    }
  };

  return (
    <div className="flex flex-col items-center h-screen bg-gray-100">
      {error && <p className="text-red-500">{error}</p>}
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