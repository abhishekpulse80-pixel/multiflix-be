# Media Transcoding Verification Checklist

Use this document to verify the Multiflix media upload, transcoding and playback flow. Mark an item `[x]` only after checking it and record the evidence beside it.

## 1. Frontend Implementation

These items are implemented in the current app code:

- [x] Presigned upload request is sent to `POST /uploads/presign`.
- [x] Media is uploaded directly to the returned `uploadUrl` with the returned `contentType`.
- [x] Optional `x-amz-acl` is sent when `acl` is present.
- [x] Video posts use `mediaKind: "short_video"`.
- [x] Image posts use `mediaKind: "image"`.
- [x] Post status uses `GET /posts/{postId}/media-status`.
- [x] Blog status uses `GET /blogs/{blogId}/media-status`.
- [x] Story status uses `GET /stories/{storyId}/media-status`.
- [x] Music audio status uses `GET /music/tracks/{trackId}/audio-status`.
- [x] Original sound audio status uses `GET /sounds/{soundId}/audio-status`.
- [x] Ready HLS playback uses the backend-provided `hlsUrl` directly.
- [x] HLS URLs are not passed through `/uploads/adaptive`.
- [x] Audio uses `recommendedUrl` when status is `ready`.
- [x] Audio falls back to the original URL during `processing` or after `failed`.
- [x] Post, blog and story polling runs every 3 seconds.
- [x] Polling stops on `ready`, `failed`, `not_required`, screen exit, or after 5 minutes.
- [x] Login accepts both `token` and `accessToken` response fields.
- [x] Development API URL targets the local backend for Android emulator and iOS simulator.

Relevant files:

- `src/config/api.ts`
- `src/store/api/uploadsApi.ts`
- `src/store/api/blogsApi.ts`
- `src/store/api/storiesApi.ts`
- `src/store/api/musicApi.ts`
- `src/store/api/soundsApi.ts`
- `src/components/home/FeedPost.tsx`
- `src/screens/BloggingWatchScreen.tsx`
- `src/screens/StoryViewerScreen.tsx`

## 2. Backend Prerequisites

Run these checks on the backend/API and worker host:

- [ ] `.env` contains `MONGODB_URI`.
- [ ] `.env` contains `JWT_SECRET`.
- [ ] `.env` contains `AWS_REGION`.
- [ ] `.env` contains `S3_BUCKET`.
- [ ] `.env` contains `AWS_ACCESS_KEY_ID`.
- [ ] `.env` contains `AWS_SECRET_ACCESS_KEY`.
- [ ] `.env` contains `S3_PUBLIC_BASE_URL` without a trailing slash.
- [ ] Redis is running and `REDIS_URL` is correct.
- [ ] `ffmpeg -version` succeeds.
- [ ] API process and worker process use the same MongoDB, Redis, S3 and public URL configuration.
- [ ] S3 or CDN allows public reads for generated HLS playlists and segments.

Expected process commands, when available in the backend repository:

```bash
pnpm build
pm2 restart multiflix-be
pm2 restart multiflix-worker
```

Health check:

```bash
curl -i http://localhost:4000/api/v1/health
```

Expected result: HTTP 2xx and a healthy service response.

## 3. Login and Presigned Upload Test

Set test values first:

```bash
export API_URL="http://localhost:4000/api/v1"
export IDENTIFIER="test-username-or-email"
export PASSWORD="test-password"
export VIDEO_FILE="/absolute/path/to/test.mp4"
```

Login:

```bash
curl -sS -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"$IDENTIFIER\",\"password\":\"$PASSWORD\"}"
```

- [ ] Login returns HTTP 2xx.
- [ ] Response contains `data.token` or `data.accessToken`.
- [ ] Copy the returned token:

```bash
export TOKEN="<JWT_TOKEN>"
```

Request a presigned URL:

```bash
curl -sS -X POST "$API_URL/uploads/presign" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contentType":"video/mp4","originalName":"test.mp4"}'
```

- [ ] Response contains `uploadUrl`.
- [ ] Response contains `key`, `bucket`, `contentType` and `url`.
- [ ] `contentType` is `video/mp4`.

Copy these response values before continuing:

```bash
export UPLOAD_URL="<data.uploadUrl>"
export UPLOAD_KEY="<data.key>"
export UPLOAD_BUCKET="<data.bucket>"
export PUBLIC_URL="<data.url>"
```

Upload directly to storage, not to the API server:

```bash
curl -i -X PUT "$UPLOAD_URL" \
  -H "Content-Type: video/mp4" \
  --upload-file "$VIDEO_FILE"
```

- [ ] Direct upload returns HTTP 2xx.
- [ ] Object is visible in S3 or CDN storage.
- [ ] API server did not receive the binary file body.

## 4. Video Post and HLS Test

Create the post only after the direct upload succeeds:

```bash
POST_RESPONSE=$(curl -sS -X POST "$API_URL/posts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"mediaKind\":\"short_video\",\"file\":{\"key\":\"$UPLOAD_KEY\",\"bucket\":\"$UPLOAD_BUCKET\",\"contentType\":\"video/mp4\",\"size\":$(wc -c < \"$VIDEO_FILE\"),\"originalName\":\"test.mp4\",\"url\":\"$PUBLIC_URL\"},\"caption\":\"Transcoding verification\",\"hashtags\":\"#test\",\"mediaWidth\":1080,\"mediaHeight\":1920,\"durationSeconds\":10,\"originalAudioMuted\":false}")
printf '%s\n' "$POST_RESPONSE"
```

- [ ] Post creation returns HTTP 2xx.
- [ ] Response contains a post ID.
- [ ] Initial `mediaProcessingStatus` is `processing`.
- [ ] Worker logs show a queued media-processing job.

Poll status:

```bash
export POST_ID="<data.post.id>"
curl -sS "$API_URL/posts/$POST_ID/media-status" \
  -H "Authorization: Bearer $TOKEN"
```

- [ ] Early response is `status: "processing"`.
- [ ] Final response is `status: "ready"`.
- [ ] Final response contains a complete public `hlsUrl` ending in `master.m3u8`.
- [ ] `hlsUrl` does not start with `/api/v1/hls/`.
- [ ] `variants` contains the generated quality playlists.
- [ ] No processing error is present.

Test the generated playlist and at least one segment:

```bash
curl -I "<hlsUrl>"
curl -I "<variant-playlist-url>"
```

- [ ] Master playlist returns HTTP 2xx.
- [ ] Variant playlist returns HTTP 2xx.
- [ ] Referenced media segments return HTTP 2xx.

## 5. Blog and Story Tests

### Video blog

- [ ] Create a video blog using the same presign and direct `PUT` flow.
- [ ] `POST /blogs` returns a blog ID.
- [ ] `GET /blogs/{blogId}/media-status` first returns `processing`.
- [ ] It eventually returns `ready` with a public `hlsUrl`.
- [ ] Blog playback uses the returned `hlsUrl` directly.

### Video story

- [ ] Create a video story using the same presign and direct `PUT` flow.
- [ ] `POST /stories` returns a story ID.
- [ ] `GET /stories/{storyId}/media-status` first returns `processing`.
- [ ] It eventually returns `ready` with a public `hlsUrl`.
- [ ] Story playback uses the returned `hlsUrl` directly.

### Image story

- [ ] Image story status returns `not_required`.
- [ ] Image story uses the original image URL.
- [ ] Image story does not open an HLS player.

## 6. Audio Tests

### Music track

```bash
curl -sS "$API_URL/music/tracks/<trackId>/audio-status?networkSpeedMbps=1.2" \
  -H "Authorization: Bearer $TOKEN"
```

- [ ] `processing` response is handled without app failure.
- [ ] `ready` response contains `recommendedUrl`.
- [ ] `recommendedUrl` plays in the music player.
- [ ] `failed` response falls back to the original audio URL.
- [ ] Variants include low, medium and high quality when processing is complete.

### Original sound

```bash
curl -sS "$API_URL/sounds/<soundId>/audio-status?networkSpeedMbps=1.2" \
  -H "Authorization: Bearer $TOKEN"
```

- [ ] The same processing, ready and failed behavior works for original sounds.
- [ ] Audio mapping follows `<0.5 Mbps = low`, `0.5-<1.5 Mbps = medium`, and `>=1.5 Mbps = high`.

## 7. Mobile App Acceptance Test

Run on both Android and iOS where possible:

- [ ] New video upload succeeds.
- [ ] New image upload succeeds.
- [ ] Video post shows a processing state and then plays.
- [ ] Blog video plays from HLS after processing.
- [ ] Story video plays from HLS after processing.
- [ ] Music track preview plays the recommended audio URL.
- [ ] Original sound preview plays the recommended audio URL.
- [ ] App does not request `/api/v1/hls/.../master.m3u8`.
- [ ] App does not manually append quality query parameters to HLS URLs.
- [ ] Polling stops when the screen is closed.
- [ ] Failed processing shows an error or fallback instead of hanging forever.
- [ ] Slow and fast network tests show HLS adaptive switching.
- [ ] Android Media3/ExoPlayer and iOS player both play the public HLS URL.

## 8. Final Decision

Only mark this section complete after Sections 2 through 7 have evidence:

- [ ] Backend worker generated HLS output successfully.
- [ ] Public HLS master and variant playlists are reachable.
- [ ] Android playback passed.
- [ ] iOS playback passed.
- [ ] Blog and story playback passed.
- [ ] Audio status and fallback behavior passed.
- [ ] No manual `/api/v1/hls/...` requests appeared in logs.
- [ ] No unbounded polling or app hang was observed.

### Client-facing statement after all checks pass

> Media transcoding integration is complete and verified end-to-end. Video posts, blogs and stories are transcoded by the backend worker into HLS, the app receives and plays the backend-provided `hlsUrl`, and audio quality selection with processing and failure fallbacks is working on Android and iOS.

Until all final checks pass, describe the work as **frontend media-transcoding integration completed; backend and device end-to-end verification pending**.