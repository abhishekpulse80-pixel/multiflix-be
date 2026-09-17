# Multiflix Media Transcoding Handover

## Status

Frontend media-transcoding integration is implemented. Android release build has been generated successfully as a signed Google Play App Bundle.

- Package: `com.multiflix`
- Version: `3.3`
- Version code: `59`
- Release artifact: `android/app/build/outputs/bundle/release/app-release.aab`

## Covered Media Areas

The app integration covers the following media types:

- Short video posts
- Video blogs
- Video stories
- Image posts and image stories
- Music tracks
- Original sounds

## Video Processing Flow

1. The app requests a presigned upload URL from the backend.
2. The selected file is uploaded directly to S3/storage using that URL.
3. The app creates the post, blog or story after the upload succeeds.
4. The backend queues the media for FFmpeg processing.
5. The worker generates HLS output and quality variants.
6. The app checks the media-status endpoint while processing is active.
7. When the status becomes `ready`, the app sends the backend-provided `hlsUrl` directly to the video player.
8. The HLS player handles adaptive quality selection according to network conditions.

The app does not construct `/api/v1/hls/...` URLs and does not modify the backend-provided HLS URL.

## Integrated Endpoints

- `POST /uploads/presign`
- `PUT <uploadUrl>` for direct storage upload
- `POST /posts`
- `GET /posts/{postId}/media-status`
- `POST /blogs`
- `GET /blogs/{blogId}/media-status`
- `POST /stories`
- `GET /stories/{storyId}/media-status`
- `GET /music/tracks/{trackId}/audio-status`
- `GET /sounds/{soundId}/audio-status`
- `GET /uploads/quality-profile`
- `POST /uploads/adaptive` for non-HLS media only

## Status Handling

- `processing`: the app continues polling and keeps the original media or poster as fallback.
- `ready`: the app plays the backend-provided `hlsUrl` or audio `recommendedUrl`.
- `failed`: polling stops and the app uses the original URL or displays the processing error.
- `not_required`: HLS playback is skipped for image/non-video media.

Polling runs approximately every 3 seconds and stops when processing completes, fails, the screen closes, or the five-minute limit is reached.

## Audio Behavior

For music tracks and original sounds, the app uses the backend audio-status response. When audio processing is complete, the recommended bitrate URL is played. During processing or failure, the original audio URL remains available as a fallback.

## Build Verification

The Android release bundle was generated successfully with Gradle:

```text
BUILD SUCCESSFUL
```

The signed AAB is available at:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## Backend Requirements

For complete end-to-end production verification, the following backend services must be running and configured:

- MongoDB
- Redis/BullMQ
- FFmpeg
- API process
- Media worker process
- S3 or compatible object storage
- Public CDN URL for HLS playlists and segments

The API and worker must use the same MongoDB, Redis, S3 bucket and public media URL configuration.

## Final Acceptance Criteria

The integration can be considered fully verified when:

- A new video upload succeeds.
- The post, blog or story initially returns `processing`.
- The worker generates HLS playlists and segments.
- The status endpoint returns `ready` with a public `hlsUrl`.
- The HLS master playlist and variant playlists return HTTP 2xx.
- Android and iOS players play the returned HLS URL.
- Audio recommended URLs play successfully.
- Failed processing shows an error or fallback instead of hanging.
- No request is made to a manually constructed `/api/v1/hls/...` URL.

## Client Communication

Use this statement after backend worker and device playback checks pass:

> Media transcoding integration has been completed and verified end-to-end. Video posts, blogs and stories are processed by the backend worker into HLS, the app plays the backend-provided adaptive `hlsUrl`, and music/original sound playback uses backend-recommended audio variants with fallback handling. The Android release bundle is ready for Google Play upload.

Before those checks pass, use this statement:

> Frontend media-transcoding integration is complete and the signed Android release bundle is ready. Final backend worker, CDN and real-device playback verification remains pending.
