# 📚 Movie Web - Watch History API Documentation

Tài liệu chi tiết về hệ thống API Lịch sử xem phim (Watch History) kết nối cơ sở dữ liệu Supabase. Thiết kế chuẩn hóa theo định dạng **camelCase**, đơn vị thời gian **mili-giây (Long)**, tương thích hoàn toàn với Web Player và Android Client (Kotlin / ExoPlayer).

---

## 📌 1. Nguyên tắc thiết kế (Core Conventions)

1. **Chuẩn hóa Key JSON**:
   * Tất cả các trường trả về đều theo chuẩn **camelCase** duy nhất (ví dụ: `serverIndex`, `episodeIndex`, `playerIndex`, `movieName`, `posterUrl`, `createdAt`).
   * Không trả trường trùng lặp dạng snake_case.

2. **Đơn vị thời gian (Time Format)**:
   * `position` và `duration` được tính bằng **mili-giây (ms)** dưới dạng số nguyên (`Long` trong Kotlin / Java, `number` trong TypeScript).
   * Ví dụ: 55 phút 43 giây = `3343000` (ms).

3. **Cơ chế quản lý Tập phim (Episode Handling)**:
   * **`episodeSlug` KHÔNG lưu trong cơ sở dữ liệu (Database)** và **KHÔNG trả về từ API lịch sử**.
   * Client (Web / Android / iOS) lấy `episodeSlug` trực tiếp từ:
     $$\text{episodeSlug} = \text{movie.servers}[\text{serverIndex}].\text{episodes}[\text{playerIndex}].\text{slug}$$
   * Request gửi lên hỗ trợ cả `playerIndex` hoặc `episodeIndex` (chỉ số 0-indexed của tập phim trong server đang chọn).

---

## 🔗 2. Danh sách Endpoints

### 2.1. Lưu tiến độ xem (Upsert History)

* **Endpoint**: `POST /api/history`
* **Mô tả**: Lưu hoặc cập nhật tiến độ xem phim cho người dùng (`userId`) hoặc thiết bị (`deviceId`).

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Body:
| Field | Type | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `userId` | string | Tùy chọn* | ID người dùng (*Cần `userId` hoặc `deviceId`) |
| `deviceId` | string | Tùy chọn* | UUID / ID định danh thiết bị |
| `slug` | string | **Bắt buộc** | Slug định danh phim (ví dụ: `sat-thu-noi-tro-vo-toi-la-sat-thu`) |
| `source` | string | **Bắt buộc** | Nguồn phim (`phimapi`, `ophim`, `nguonc`, `vsmov`) |
| `serverIndex` | integer | Tùy chọn | Vị trí server đang xem (mặc định: `0`) |
| `playerIndex` | integer | Tùy chọn | Vị trí tập phim trong server đang xem (mặc định: `0`) (có thể dùng alias `episodeIndex`) |
| `position` | integer (Long) | **Bắt buộc** | Thời điểm đã xem tính bằng **mili-giây** (ví dụ: `3343061`) |
| `duration` | integer (Long) | Tùy chọn | Tổng thời lượng video tính bằng **mili-giây** (ví dụ: `3754040`) |
| `movieName` | string | Tùy chọn | Tên phim |
| `posterUrl` | string | Tùy chọn | URL ảnh poster |
| `thumbUrl` | string | Tùy chọn | URL ảnh thumbnail / backdrop |

> [!NOTE]
> Server có cơ chế bảo vệ: Nếu gửi `position <= 0` trong khi bản ghi trong DB đã có tiến độ xem $> 0$, server sẽ tự động giữ nguyên tiến độ cũ để tránh việc mở trang vô tình xóa mất lịch sử của người dùng.

#### Request Body Ví dụ:
```json
{
  "userId": "user_123456",
  "slug": "sat-thu-noi-tro-vo-toi-la-sat-thu",
  "source": "phimapi",
  "serverIndex": 0,
  "playerIndex": 2,
  "position": 3343061,
  "duration": 3754040,
  "movieName": "Sát Thủ Nội Trợ: Vợ Tôi Là Sát Thủ",
  "posterUrl": "https://phimimg.com/upload/vod/20240905-1/poster.jpg"
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 12,
    "syncId": "user_123456",
    "userId": "user_123456",
    "deviceId": null,
    "slug": "sat-thu-noi-tro-vo-toi-la-sat-thu",
    "source": "phimapi",
    "serverIndex": 0,
    "episodeIndex": 2,
    "playerIndex": 2,
    "position": 3343061,
    "duration": 3754040,
    "movieName": "Sát Thủ Nội Trợ: Vợ Tôi Là Sát Thủ",
    "posterUrl": "https://phimimg.com/upload/vod/20240905-1/poster.jpg",
    "thumbUrl": "https://phimimg.com/upload/vod/20240905-1/poster.jpg",
    "createdAt": "2026-10-12T03:30:00.000Z",
    "updatedAt": "2026-10-12T06:50:00.000Z"
  }
}
```

---

### 2.2. Lấy danh sách hoặc chi tiết lịch sử xem

* **Endpoint**: `GET /api/history`
* **Query Parameters**:
  * `userId`: ID người dùng (hoặc `deviceId`)
  * `slug` *(tùy chọn)*: Nếu truyền `slug`, API trả về tiến độ của đúng phim đó. Nếu không truyền, trả về danh sách lịch sử.
  * `limit` *(tùy chọn)*: Số lượng bản ghi tối đa (mặc định: `50`, tối đa: `100`).

#### Ví dụ 1: Lấy chi tiết 1 phim
```http
GET /api/history?userId=user_123456&slug=sat-thu-noi-tro-vo-toi-la-sat-thu
```
Response:
```json
{
  "success": true,
  "item": {
    "id": 12,
    "syncId": "user_123456",
    "userId": "user_123456",
    "deviceId": null,
    "slug": "sat-thu-noi-tro-vo-toi-la-sat-thu",
    "source": "phimapi",
    "serverIndex": 0,
    "episodeIndex": 2,
    "playerIndex": 2,
    "position": 3343061,
    "duration": 3754040,
    "movieName": "Sát Thủ Nội Trợ: Vợ Tôi Là Sát Thủ",
    "posterUrl": "https://phimimg.com/upload/vod/20240905-1/poster.jpg",
    "thumbUrl": "https://phimimg.com/upload/vod/20240905-1/poster.jpg",
    "createdAt": "2026-10-12T03:30:00.000Z",
    "updatedAt": "2026-10-12T06:50:00.000Z"
  }
}
```

#### Ví dụ 2: Lấy danh sách lịch sử
```http
GET /api/history?userId=user_123456&limit=20
```
Response:
```json
{
  "success": true,
  "items": [
    {
      "id": 12,
      "syncId": "user_123456",
      "userId": "user_123456",
      "deviceId": null,
      "slug": "sat-thu-noi-tro-vo-toi-la-sat-thu",
      "source": "phimapi",
      "serverIndex": 0,
      "episodeIndex": 2,
      "playerIndex": 2,
      "position": 3343061,
      "duration": 3754040,
      "movieName": "Sát Thủ Nội Trợ: Vợ Tôi Là Sát Thủ",
      "posterUrl": "https://phimimg.com/upload/vod/20240905-1/poster.jpg",
      "thumbUrl": "https://phimimg.com/upload/vod/20240905-1/poster.jpg",
      "createdAt": "2026-10-12T03:30:00.000Z",
      "updatedAt": "2026-10-12T06:50:00.000Z"
    }
  ]
}
```

---

### 2.3. Xóa lịch sử xem

* **Endpoint**: `DELETE /api/history`
* **Query Parameters**:
  * `userId` hoặc `deviceId`: Bắt buộc.
  * `slug` *(tùy chọn)*: Xóa 1 phim cụ thể. Nếu không truyền, xóa toàn bộ lịch sử của người dùng/thiết bị.

#### Response:
```json
{
  "success": true
}
```

---

### 2.4. Endpoints riêng theo User ID (`/api/history/user/{id}`)

Dành riêng cho client truyền `userId` trực tiếp qua đường dẫn URL:

* `GET /api/history/user/{id}`: Lấy danh sách lịch sử theo `userId` (hỗ trợ query `?slug=...` và `?limit=...`).
* `POST /api/history/user/{id}`: Upsert lịch sử theo `userId` (Body không cần truyền `userId`).
* `DELETE /api/history/user/{id}`: Xóa lịch sử theo `userId` (hỗ trợ query `?slug=...`).

---

## 📱 3. Hướng dẫn tích hợp phía Client (Android / Kotlin / Web)

### 3.1. Cách lấy `episodeSlug` để phát video
Khi nhận dữ liệu lịch sử từ API, client không tìm `episodeSlug` trong response mà dùng `detail + serverIndex + playerIndex`:

```kotlin
// Kotlin ví dụ
fun getEpisodeToPlay(movieDetail: MovieDetail, historyItem: HistoryItem): Episode {
    val server = movieDetail.servers.getOrNull(historyItem.serverIndex) 
        ?: movieDetail.servers.first()
        
    val episode = server.episodes.getOrNull(historyItem.playerIndex) 
        ?: server.episodes.first()
        
    // episode.slug chính là slug tập phim cần phát
    return episode
}
```

### 3.2. Khởi tạo tua tiếp tục (Resume Seek) trên ExoPlayer
```kotlin
val targetPositionMs: Long = historyItem.position // mili-giây
exoPlayer.setMediaItem(MediaItem.fromUri(episode.linkM3u8))
exoPlayer.prepare()

// Tua thẳng đến vị trí đã lưu
if (targetPositionMs > 3000L) {
    exoPlayer.seekTo(targetPositionMs)
}
exoPlayer.play()
```

### 3.3. Lưu tiến độ xem lên Server
```kotlin
val currentPosMs: Long = exoPlayer.currentPosition
val durationMs: Long = exoPlayer.duration

val payload = HistoryPayload(
    slug = movieDetail.slug,
    source = movieDetail.source,
    serverIndex = currentServerIndex,
    playerIndex = currentPlayerIndex,
    position = currentPosMs,
    duration = durationMs,
    movieName = movieDetail.name,
    posterUrl = movieDetail.posterUrl
)

// Gửi POST tới /api/history hoặc /api/history/user/{userId}
apiService.saveWatchHistory(payload)
```
