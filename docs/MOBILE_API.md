# TÀI LIỆU TÍCH HỢP REST API CHO MOBILE APP (WATCH HISTORY SYNC)

Tài liệu này cung cấp chi tiết các API đọc, ghi, cập nhật và xóa lịch sử xem phim đồng bộ qua User ID dành cho ứng dụng di động (Flutter, Kotlin Multiplatform / Android, Swift / iOS, React Native).

---

## 1. THÔNG TIN CẤU HÌNH CHUNG

| Mục | Giá trị |
| :--- | :--- |
| **Base URL (Production)** | `https://your-domain.com` *(Thay bằng domain web thực tế khi deploy)* |
| **Base URL (Local Testing)** | `http://<IP_MAY_TINH>:3000` *(Dùng IP LAN của máy tính, không dùng `localhost` trên thiết bị thật)* |
| **Content-Type** | `application/json` |
| **Kiểu định danh (ID)** | Chuỗi ký tự bất kỳ (`username`, `email`, `UUID`, v.v.) do người dùng nhập hoặc sinh tự động. |
| **Độ tương thích dữ liệu** | Trả về đồng thời cả **snake_case** và **camelCase** (tối ưu hóa cho Kotlin, Swift Codable, Dart). |

---

## 2. DANH SÁCH API ENDPOINTS

### 2.1. Lấy toàn bộ danh sách lịch sử theo User ID
* **Endpoint:** `GET /api/history/user/{userId}`
* **Mô tả:** Lấy danh sách các bộ phim đã xem của người dùng, sắp xếp theo thời gian xem gần nhất (`updated_at` giảm dần).

#### Query Parameters:
| Param | Kiểu | Bắt buộc | Mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- |
| `limit` | `number` | Không | `50` | Số lượng bản ghi tối đa (tối thiểu 1, tối đa 100). |

#### Response Mẫu (200 OK):
```json
{
  "success": true,
  "userId": "manhhlunn",
  "items": [
    {
      "id": 4,
      "syncId": "manhhlunn",
      "userId": "manhhlunn",
      "deviceId": "b33b1d27-68f3-419f-831c-0c2e1ae28fc0",
      "slug": "sat-thu-noi-tro-vo-toi-la-sat-thu",
      "source": "phimapi",
      "serverIndex": 0,
      "episodeIndex": 0,
      "episodeSlug": "tap-01",
      "position": 3343061,
      "duration": 3754040,
      "movieName": "Sát Thủ Nội Trợ (Vợ Tôi Là Sát Thủ)",
      "posterUrl": "https://phimimg.com/uploads/movies/20260802/sat-thu-noi-tro-poster.webp",
      "thumbUrl": "https://phimimg.com/uploads/movies/20260802/sat-thu-noi-tro-thumb.webp",
      "createdAt": "2026-10-09T10:27:43.3885+00:00",
      "updatedAt": "2026-10-09T10:27:54.306+00:00"
    }
  ]
}
```

---

### 2.2. Lấy tiến độ 1 bộ phim cụ thể (Resume Check)
* **Endpoint:** `GET /api/history/user/{userId}?slug={slug}`
* **Mô tả:** Kiểm tra xem người dùng đã từng xem phim này chưa, dừng ở tập nào và giây thứ bao nhiêu để hiển thị nút "Xem tiếp" hoặc tự động tua (seek).

#### Query Parameters:
| Param | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `slug` | `string` | **Có** | Mã định danh slug của phim (VD: `sat-thu-noi-tro-vo-toi-la-sat-thu`). |

#### Response Mẫu (200 OK - Đã từng xem):
```json
{
  "success": true,
  "userId": "manhhlunn",
  "item": {
    "id": 4,
    "syncId": "manhhlunn",
    "userId": "manhhlunn",
    "deviceId": "b33b1d27-68f3-419f-831c-0c2e1ae28fc0",
    "slug": "sat-thu-noi-tro-vo-toi-la-sat-thu",
    "source": "phimapi",
    "serverIndex": 0,
    "episodeIndex": 0,
    "episodeSlug": "tap-01",
    "position": 3343061,
    "duration": 3754040,
    "movieName": "Sát Thủ Nội Trợ (Vợ Tôi Là Sát Thủ)",
    "posterUrl": "https://phimimg.com/uploads/movies/20260802/sat-thu-noi-tro-poster.webp",
    "thumbUrl": "https://phimimg.com/uploads/movies/20260802/sat-thu-noi-tro-thumb.webp",
    "createdAt": "2026-10-09T10:27:43.3885+00:00",
    "updatedAt": "2026-10-09T10:27:54.306+00:00"
  }
}
```

*Nếu chưa từng xem phim này:* `item` sẽ trả về `null`:
```json
{
  "success": true,
  "userId": "manhhlunn",
  "item": null
}
```

---

### 2.3. Lưu / Cập nhật tiến độ xem phim (Write / Upsert)
* **Endpoint:** `POST /api/history/user/{userId}`
* **Mô tả:** Lưu hoặc cập nhật tiến độ xem phim. Nếu phim đã có trong lịch sử thì cập nhật thời gian xem mới nhất; nếu chưa có thì thêm mới.

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Body Fields:
| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `slug` | `string` | **Có** | Slug phim (VD: `"sat-thu-noi-tro-vo-toi-la-sat-thu"`). |
| `source` | `string` | **Có** | Nguồn phim (`"phimapi"`, `"ophim"`, `"nguonc"`, `"vsmov"`). |
| `position` | `Long` (ms) | **Có** | Vị trí hiện tại của player tính bằng **mili-giây** (VD: `3343061` tương đương `player.currentPosition`). |
| `duration` | `Long` (ms) | Không | Tổng thời lượng của tập phim tính bằng **mili-giây** (VD: `3754040` tương đương `player.duration`). |
| `serverIndex` | `number` | Không | Chỉ số server đang xem (mặc định: `0`). |
| `episodeIndex` | `number` | Không | Chỉ số tập trong server (mặc định: `0`). |
| `episodeSlug` | `string` | Không | Slug tập phim (VD: `"tap-01"` hoặc `"tap-3"`). |
| `movieName` | `string` | Không | Tên hiển thị của phim (VD: `"Sát Thủ Nội Trợ"`). |
| `posterUrl` | `string` | Không | Link ảnh poster dọc. |
| `thumbUrl` | `string` | Không | Link ảnh thumbnail ngang (backdrop). |
| `deviceId` | `string` | Không | UUID của thiết bị mobile (tùy chọn). |

#### Request Body Mẫu:
```json
{
  "slug": "one-piece",
  "source": "phimapi",
  "serverIndex": 0,
  "episodeIndex": 2,
  "episodeSlug": "tap-3",
  "position": 350500,
  "duration": 1420000,
  "movieName": "Đảo Hải Tặc",
  "posterUrl": "https://phimimg.com/uploads/movies/one-piece-poster.webp",
  "thumbUrl": "https://phimimg.com/uploads/movies/one-piece-thumb.webp",
  "deviceId": "c1f20e4b-97e3-4652-87ad-72f10b72c72b"
}
```

#### Response Mẫu (200 OK):
```json
{
  "success": true,
  "userId": "manhhlunn",
  "data": {
    "id": 5,
    "syncId": "manhhlunn",
    "userId": "manhhlunn",
    "deviceId": "c1f20e4b-97e3-4652-87ad-72f10b72c72b",
    "slug": "one-piece",
    "source": "phimapi",
    "serverIndex": 0,
    "episodeIndex": 2,
    "episodeSlug": "tap-3",
    "position": 350500,
    "duration": 1420000,
    "movieName": "Đảo Hải Tặc",
    "posterUrl": "https://phimimg.com/uploads/movies/one-piece-poster.webp",
    "thumbUrl": "https://phimimg.com/uploads/movies/one-piece-thumb.webp",
    "createdAt": "2026-10-09T10:35:00.000Z",
    "updatedAt": "2026-10-09T10:35:00.000Z"
  }
}
```

---

### 2.4. Xóa lịch sử xem phim (Delete)
* **Endpoint:** `DELETE /api/history/user/{userId}`
* **Mô tả:** Xóa 1 bộ phim khỏi lịch sử xem, hoặc xóa toàn bộ lịch sử của người dùng đó.

#### Query Parameters:
| Param | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `slug` | `string` | Không | Nếu truyền `slug`: **Chỉ xóa bộ phim này**.<br>Nếu **không truyền** `slug`: **Xóa toàn bộ lịch sử** của User ID này. |

#### Ví dụ 1: Xóa 1 phim
```http
DELETE /api/history/user/manhhlunn?slug=sat-thu-noi-tro-vo-toi-la-sat-thu
```
Response:
```json
{
  "success": true,
  "userId": "manhhlunn"
}
```

#### Ví dụ 2: Xóa toàn bộ lịch sử
```http
DELETE /api/history/user/manhhlunn
```
Response:
```json
{
  "success": true,
  "userId": "manhhlunn"
}
```

---

## 3. NGUYÊN TẮC TÍCH HỢP TỐI ƯU TRÊN MOBILE APP (BEST PRACTICES)

1. **Tần suất gửi lưu tiến độ (Throttling / Debouncing)**:
   - Khi player đang phát, **không gọi API mỗi giây**. Nên gửi định kỳ mỗi **5 – 10 giây**.
   - Gửi ngay lập tức khi người dùng:
     - Bấm nút **Tạm dừng (Pause)**.
     - Tua thời gian (Seek bar thả tay ra).
     - Bấm **Next tập / Chuyển tập**.
     - Bấm nút **Back / Thoát trình phát**.
2. **Xử lý vòng đời ứng dụng (App Lifecycle)**:
   - Khi app bị ẩn xuống background (`onPause` / `onStop` trên Android, `applicationDidEnterBackground` trên iOS, `AppLifecycleState.paused` trên Flutter): Gửi ngay một request lưu vị trí hiện tại.
3. **Cơ chế Offline & Retry**:
   - Nếu thiết bị mất mạng tạm thời khi đang xem, lưu vị trí vào local database của mobile (`Room`, `CoreData`, `Hive`, `SharedPreferences`).
   - Khi có mạng trở lại, gửi sync bù lên API.
4. **Cơ chế Tua tiếp (Auto-Resume)**:
   - Khi người dùng chọn tập để xem: Gọi `GET /api/history/user/{userId}?slug={slug}`.
   - Nếu `item.episodeSlug == currentEpisode && item.position > 5`: Gọi hàm `player.seekTo(item.position)`.

---

## 4. CODE MẪU TÍCH HỢP TRÊN KOTLIN (ANDROID & KMP)

### A. Base URL theo môi trường:
* **Máy ảo Android Emulator:** `http://10.0.2.2:3000/` *(Emulator map 10.0.2.2 vào localhost máy tính)*
* **Thiết bị thật (Cắm cáp / Wi-Fi LAN):** `http://172.22.9.148:3000/` *(IP máy tính)*
* **Production:** `https://your-domain.com/`

> **Lưu ý Android Cleartext Traffic:** Khi test với `http://` cục bộ, hãy thêm `android:usesCleartextTraffic="true"` vào thẻ `<application>` trong `AndroidManifest.xml`.

### B. Data Models (`kotlinx.serialization` hoặc Gson)
```kotlin
package com.movie.data.model

data class WatchHistoryItem(
    val id: Long? = null,
    val syncId: String? = null,
    val userId: String? = null,
    val deviceId: String? = null,
    val slug: String,
    val source: String,
    val serverIndex: Int = 0,
    val episodeIndex: Int = 0,
    val episodeSlug: String? = null,
    val position: Long = 0L, // Mili-giây dạng Long (ExoPlayer player.currentPosition)
    val duration: Long = 0L, // Mili-giây dạng Long (ExoPlayer player.duration)
    val movieName: String? = null,
    val posterUrl: String? = null,
    val thumbUrl: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

data class WatchHistoryListResponse(
    val success: Boolean,
    val userId: String? = null,
    val items: List<WatchHistoryItem> = emptyList(),
    val error: String? = null
)

data class WatchHistorySingleResponse(
    val success: Boolean,
    val userId: String? = null,
    val item: WatchHistoryItem? = null,
    val error: String? = null
)

data class SaveHistoryRequest(
    val slug: String,
    val source: String,
    val serverIndex: Int = 0,
    val episodeIndex: Int = 0,
    val episodeSlug: String? = null,
    val position: Long, // Gửi theo mili-giây: player.currentPosition
    val duration: Long = 0L, // Gửi theo mili-giây: player.duration
    val movieName: String? = null,
    val posterUrl: String? = null,
    val thumbUrl: String? = null,
    val deviceId: String? = null
)
```

### C. Retrofit Service Interface
```kotlin
package com.movie.data.api

import com.movie.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface MovieHistoryApi {
    // 1. Lấy toàn bộ danh sách lịch sử theo User ID
    @GET("api/history/user/{userId}")
    suspend fun getHistory(
        @Path("userId") userId: String,
        @Query("limit") limit: Int = 50
    ): Response<WatchHistoryListResponse>

    // 2. Lấy tiến độ 1 phim cụ thể để tua tiếp (Resume)
    @GET("api/history/user/{userId}")
    suspend fun getMovieProgress(
        @Path("userId") userId: String,
        @Query("slug") slug: String
    ): Response<WatchHistorySingleResponse>

    // 3. Lưu / cập nhật tiến độ xem
    @POST("api/history/user/{userId}")
    suspend fun saveProgress(
        @Path("userId") userId: String,
        @Body request: SaveHistoryRequest
    ): Response<WatchHistorySingleResponse>

    // 4. Xóa 1 phim khỏi lịch sử
    @DELETE("api/history/user/{userId}")
    suspend fun deleteMovie(
        @Path("userId") userId: String,
        @Query("slug") slug: String
    ): Response<Unit>

    // 5. Xóa toàn bộ lịch sử của User ID
    @DELETE("api/history/user/{userId}")
    suspend fun clearHistory(
        @Path("userId") userId: String
    ): Response<Unit>
}
```

### D. ApiClient Singleton
```kotlin
package com.movie.data.api

import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    // Đổi URL này theo môi trường bạn đang test:
    // - Máy ảo: "http://10.0.2.2:3000/"
    // - Máy thật cùng Wi-Fi: "http://172.22.9.148:3000/"
    // - Production: "https://your-domain.com/"
    const val BASE_URL = "http://172.22.9.148:3000/"

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    val historyApi: MovieHistoryApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(MovieHistoryApi::class.java)
    }
}
```

