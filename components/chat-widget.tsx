"use client";

import Script from "next/script";

export function ChatWidget() {
  return (
    <Script
      src="https://widgets.leadconnectorhq.com/loader.js"
      data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
      data-widget-id="6ab43f91d8530f3af338feb0"
      strategy="lazyOnload"
      id="ghl-chat-widget-loader"
    />
  );
}
