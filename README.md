# Adobe AEP Learning Lab

A native React Native playground for initializing Adobe Experience Platform Mobile SDK, changing Edge consent, sending an XDM page view, and starting Assurance. The live activity panel records each SDK call and result.

## Setup
- Use Node.js 18+ and React Native CLI toolchains (Android Studio/JDK; Xcode and CocoaPods for iOS).
- Run `npm install`.
- Copy `.env.example` to `.env` and set `AEP_APP_ID` to your Adobe Data Collection mobile property environment ID. The app ID is configuration and is included in the built app; do not put private credentials, client secrets, or server API keys in a mobile app `.env` because build-time values can be extracted from the app.
- You can also enter the app ID in the app's setup field at runtime.
- Run `npm run android` or `npm run ios`.

This starter contains the JS/TypeScript app and native module dependencies. Add/generate the native iOS and Android projects for your environment before building. For iOS, run `cd ios && pod install && cd ..`. Register the chosen URL scheme in the native app configurations so Assurance links can open the app. Configure the Edge datastream in Adobe Data Collection first.
