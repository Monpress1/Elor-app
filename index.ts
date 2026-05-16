// supabase/functions/send-push/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webpush from "npm:web-push@3.6.7";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ===============================
// VAPID CONFIG
// ===============================

const VAPID_PUBLIC_KEY =
  "BAkq_2ZCp335lLLytu54Wsv7RDDhHYgz21DMHQ1Np-6RKR-VcpzxNaJ4HNGUKT25jNf6J_T9s1hh8mUGWTBXax8";

const VAPID_PRIVATE_KEY =
  "uUSH6q1V1gDLiHWAiHF-9F9QIi4EGSgW_bG3Eehh53Q";

webpush.setVapidDetails(
  "mailto:admin@elor.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serve(async (req) => {
  console.log("[SEND-PUSH] Incoming Request:", req.method);

  // ===============================
  // HANDLE CORS
  // ===============================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: CORS_HEADERS,
    });
  }

  try {
    // ===============================
    // PARSE BODY
    // ===============================

    const payloadData = await req.json();

    console.log(
      "[SEND-PUSH] Payload:",
      JSON.stringify(payloadData, null, 2)
    );

    const {
      subscription,
      title,
      body,
      url,
      image,
    } = payloadData;

    // ===============================
    // VALIDATE
    // ===============================

    if (!subscription || !subscription.endpoint) {
      return new Response(
        JSON.stringify({
          error: "Invalid push subscription",
        }),
        {
          status: 400,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ===============================
    // PUSH PAYLOAD
    // ===============================

    const pushPayload = JSON.stringify({
      title: title || "ELOR Atelier",

      body:
        body ||
        "You have a new notification from ELOR Atelier.",

      // LARGE ICON LEFT SIDE
      icon:
        "https://lxtoxjhcdtzuxyirzxpc.supabase.co/storage/v1/object/public/assets/icon-512.png",

      // REMOVE SMALL CHROME-LIKE BADGE
      // badge intentionally removed

      // BIG EXPANDED IMAGE
      image:
        image ||
        "https://lxtoxjhcdtzuxyirzxpc.supabase.co/storage/v1/object/public/assets/banner.jpg",

      vibrate: [200, 100, 200],

      tag: "elor-notification",

      renotify: true,

      requireInteraction: false,

      data: {
        url: url || "/",
      },
    });

    console.log("[SEND-PUSH] Sending Push Notification...");

    // ===============================
    // SEND PUSH
    // ===============================

    await webpush.sendNotification(
      subscription,
      pushPayload
    );

    console.log("[SEND-PUSH] SUCCESS");

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("[SEND-PUSH] ERROR:", error);

    if (error.statusCode) {
      console.error(
        "[SEND-PUSH] Status:",
        error.statusCode
      );

      console.error(
        "[SEND-PUSH] Body:",
        error.body
      );
    }

    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
        },
      }
    );
  }
});