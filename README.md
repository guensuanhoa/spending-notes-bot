# 📱 Telegram Spending Notes Bot

Bot Telegram thông minh giúp ghi chép chi tiêu tự động vào Google Sheets, sử dụng AI (Google Gemini) để phân tích tin nhắn tiếng Việt.

<p align="right">
  <a href="https://github.com/guensuanhoa/spending-notes-bot" target="_blank">
    🔗 View on GitHub
  </a>
</p>


## 🎯 Tính năng

- ✅ Gửi tin nhắn chi tiêu vào Telegram, bot tự động ghi vào Google Sheets
- 🤖 AI phân tích tin nhắn thông minh (hỗ trợ nhiều định dạng)
- 📅 Hỗ trợ "Hôm nay", "Hôm qua", "Hôm kia" hoặc ngày cụ thể
- 💰 Tự động nhận diện số tiền (70k, 1.5m, 2tr, 70.000, v.v.)
- 🌏 Múi giờ Việt Nam (UTC+7)
- 🔒 Bảo mật với secret token

## 📋 Yêu cầu trước khi bắt đầu

1. **Tài khoản cần có:**
   - Tài khoản Telegram
   - Tài khoản Google (Gmail)
   - Tài khoản Vercel (miễn phí - để deploy bot)

2. **Kiến thức cần có:**
   - Không cần! Hướng dẫn này dành cho người mới bắt đầu

## 🚀 Hướng dẫn Deploy từng bước

### Bước 1: Tạo Telegram Bot

1. Mở Telegram, tìm và chat với **@BotFather**
2. Gửi lệnh `/newbot`
3. Đặt tên cho bot (ví dụ: `My Spending Bot`)
4. Đặt username cho bot (phải kết thúc bằng `bot`, ví dụ: `myspending_bot`)
5. BotFather sẽ trả về **BOT_TOKEN** (dạng `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)
6. **LƯU LẠI** token này - bạn sẽ cần dùng sau

### Bước 2: Tạo Google Sheet

1. Truy cập https://sheets.google.com
2. Tạo Sheet mới (hoặc dùng Sheet có sẵn)
3. Đặt tên tab là `Sheet1` (hoặc tên khác, bạn sẽ config sau)
4. Tạo header ở hàng đầu tiên (tùy chọn):
   ```
   Timestamp | Người gửi | Ngày | Ghi chú | Số tiền
   ```
5. Lấy **SHEET_ID** từ URL:
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID ở đây]/edit
   ```
   Ví dụ: `1A2B3C4D5E6F7G8H9I0J`
6. **LƯU LẠI** SHEET_ID

### Bước 3: Tạo Google Service Account

1. Truy cập https://console.cloud.google.com
2. Tạo Project mới hoặc chọn Project có sẵn
3. Vào **APIs & Services** > **Enable APIs and Services**
4. Tìm và enable **Google Sheets API**
5. Vào **APIs & Services** > **Credentials**
6. Click **Create Credentials** > **Service Account**
7. Đặt tên Service Account (ví dụ: `telegram-bot`)
8. Click **Create and Continue** > **Done**
9. Click vào Service Account vừa tạo
10. Vào tab **Keys** > **Add Key** > **Create new key**
11. Chọn **JSON** > **Create**
12. File JSON sẽ được tải về máy

13. **Mở file JSON**, bạn sẽ thấy:
    ```json
    {
      "type": "service_account",
      "project_id": "...",
      "private_key_id": "...",
      "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
      "client_email": "telegram-bot@project-id.iam.gserviceaccount.com",
      ...
    }
    ```

14. **LƯU LẠI:**
    - `client_email` (GOOGLE_SERVICE_ACCOUNT_EMAIL)
    - `private_key` (GOOGLE_PRIVATE_KEY) - bao gồm cả `-----BEGIN...` và `-----END...`

### Bước 4: Chia sẻ Google Sheet với Service Account

1. Quay lại Google Sheet của bạn
2. Click nút **Share** (Chia sẻ)
3. Dán `client_email` từ bước 3 (dạng `...@...iam.gserviceaccount.com`)
4. Chọn quyền **Editor**
5. Bỏ tick "Notify people" nếu có
6. Click **Share**

### Bước 5: Lấy Gemini API Key

1. Truy cập https://aistudio.google.com/app/apikey
2. Đăng nhập bằng tài khoản Google
3. Click **Get API Key** hoặc **Create API Key**
4. Chọn project hoặc tạo project mới
5. **LƯU LẠI** API Key (dạng `AIza...`)

### Bước 6: Deploy lên Vercel

1. **Fork hoặc Clone repository này** về máy
2. Truy cập https://vercel.com
3. Đăng nhập bằng GitHub
4. Click **Add New** > **Project**
5. Import repository này
6. **QUAN TRỌNG**: Thêm Environment Variables:

   | Name | Value | Lấy từ đâu |
   |------|-------|------------|
   | `TELEGRAM_SECRET_TOKEN` | Tự tạo (dạng `my-secret-123`) | Tự đặt ngẫu nhiên |
   | `GEMINI_API_KEY` | `AIza...` | Bước 5 |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `...@...iam.gserviceaccount.com` | Bước 3 |
   | `GOOGLE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` | Bước 3 |
   | `SHEET_ID` | `1A2B3C4D...` | Bước 2 |
   | `SHEET_TAB` | `Sheet1` | Tên tab trong Sheet |
   | `BA_USER_ID` | User ID Telegram của "Ba" | Xem phần Debug bên dưới |

   **CHÚ Ý về GOOGLE_PRIVATE_KEY:**
   - Copy toàn bộ private key từ file JSON, bao gồm cả `-----BEGIN...` và `-----END...`
   - Vercel sẽ tự động xử lý các ký tự xuống dòng `\n`

7. Click **Deploy**
8. Đợi deploy xong (khoảng 1-2 phút)
9. Vercel sẽ cho bạn URL (ví dụ: `https://your-project.vercel.app`)
10. **LƯU LẠI** URL này

### Bước 7: Kết nối Telegram Bot với Webhook

1. Mở trình duyệt web
2. Truy cập URL sau (thay thế giá trị của bạn):
   ```
   https://api.telegram.org/bot[BOT_TOKEN]/setWebhook?url=https://[VERCEL_URL]/api/webhook&secret_token=[TELEGRAM_SECRET_TOKEN]
   ```
   
   **Ví dụ thực tế:**
   ```
   https://api.telegram.org/bot1234567890:ABCdefGHI/setWebhook?url=https://my-bot.vercel.app/api/webhook&secret_token=my-secret-123
   ```

3. Bạn sẽ thấy phản hồi:
   ```json
   {"ok":true,"result":true,"description":"Webhook was set"}
   ```

4. **Xong!** Bot đã sẵn sàng

## 📝 Cách sử dụng

### Format tin nhắn

Bot hỗ trợ nhiều format, chỉ cần gửi tin nhắn tự nhiên:

**Cách 1: Định dạng tự do (AI tự hiểu)**
```
Hôm nay mua cà phê 45k
```
```
Hôm qua ăn trưa 120.000
```
```
23/10/2025, đi chợ, 250k
```
```
Mua sách 1.5m ngày 20/10/2025
```

**Cách 2: Định dạng chuẩn (fallback)**
```
[Ngày], [Ghi chú], [Số tiền]
```

Ví dụ:
```
Hôm nay, Cafe, 50000
```
```
24/10/2025, Ăn trưa, 150k
```
```
Hôm qua, Xăng xe, 200000
```

### Ngày hỗ trợ

- **Tương đối:**
  - `Hôm nay`
  - `Hôm qua`
  - `Hôm kia`

- **Tuyệt đối:**
  - `24/10/2025`
  - `24-10-2025`
  - `1/1/2025`

### Số tiền hỗ trợ

- `70000` = 70,000 VND
- `70.000` = 70,000 VND
- `70k` = 70,000 VND
- `1.5m` = 1,500,000 VND
- `2tr` = 2,000,000 VND
- `₫70.000` = 70,000 VND

## 🔧 Tùy chỉnh

### Thay đổi tên người gửi

Bot sử dụng User ID Telegram để phân biệt người gửi. Mặc định:
- Nếu User ID khớp với `BA_USER_ID` → hiển thị "Ba"
- Nếu không khớp → hiển thị "Mẹ"

**Cách thay đổi:**

1. **Lấy User ID của bạn:**
   - Chat với bot [@userinfobot](https://t.me/userinfobot)
   - Bot sẽ trả về User ID (ví dụ: `123456789`)

2. **Thêm vào Vercel Environment Variables:**
   - Vào Vercel Dashboard > Settings > Environment Variables
   - Thêm `BA_USER_ID` = User ID của người thứ nhất
   - Redeploy project

3. **Tùy chỉnh tên hiển thị (nếu cần):**
   - Mở file `api/webhook.js`
   - Tìm dòng: `userId === baUserId ? 'Ba' : 'Mẹ',`
   - Thay `'Ba'` và `'Mẹ'` thành tên bạn muốn
   - Commit và push code

### Thay đổi tên tab Google Sheet

Vào Vercel > Settings > Environment Variables > Sửa `SHEET_TAB`

## 🐛 Debug & Kiểm tra

### Xem User ID Telegram của bạn

1. Chat với bot [@userinfobot](https://t.me/userinfobot)
2. Bot sẽ trả về User ID của bạn (ví dụ: `123456789`)
3. Sử dụng User ID này để config `BA_USER_ID` trong Vercel

### Xem logs trên Vercel

1. Vào Vercel Dashboard
2. Chọn project
3. Vào tab **Logs** hoặc **Deployments** > Click deployment > **Functions**
4. Xem logs real-time khi gửi tin nhắn

### Kiểm tra webhook đã được set chưa

Truy cập:
```
https://api.telegram.org/bot[BOT_TOKEN]/getWebhookInfo
```

Phản hồi sẽ hiển thị URL webhook hiện tại và trạng thái.

## ❓ Các lỗi thường gặp

### 1. Bot không phản hồi

- Kiểm tra webhook đã set đúng chưa (xem phần Debug)
- Kiểm tra `TELEGRAM_SECRET_TOKEN` khớp giữa Vercel và setWebhook
- Xem logs trên Vercel

### 2. Không ghi được vào Sheet

- Kiểm tra đã share Sheet với Service Account email chưa
- Kiểm tra `GOOGLE_PRIVATE_KEY` copy đầy đủ (bao gồm BEGIN và END)
- Kiểm tra `SHEET_ID` đúng chưa
- Xem logs trên Vercel để biết lỗi cụ thể

### 3. AI không phân tích đúng

- Kiểm tra `GEMINI_API_KEY` còn hạn sử dụng
- Thử format tin nhắn rõ ràng hơn
- Fallback thủ công vẫn hoạt động nếu AI fail

### 4. Lỗi "Invalid private key"

- Đảm bảo copy toàn bộ private key từ JSON file
- Bao gồm cả `-----BEGIN PRIVATE KEY-----` và `-----END PRIVATE KEY-----`
- Không thêm/bớt dấu cách hoặc xuống dòng

## 📂 Cấu trúc Project

```
telegram-logger/
├── api/
│   └── webhook.js          # Xử lý webhook từ Telegram
├── package.json            # Dependencies
├── .gitignore             # Ignore node_modules, .vercel
└── README.md              # File này
```

## 🔒 Bảo mật

- **KHÔNG** commit file JSON của Service Account vào Git
- **KHÔNG** chia sẻ BOT_TOKEN, API Keys với ai
- Sử dụng `TELEGRAM_SECRET_TOKEN` để bảo vệ webhook
- Tất cả sensitive data đều lưu trong Environment Variables trên Vercel

## 📦 Dependencies

- `@google/generative-ai`: Tích hợp Google Gemini AI
- `googleapis`: Tương tác với Google Sheets API

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Tạo Pull Request hoặc Issue nếu bạn gặp vấn đề.

## 📄 License

ISC

---

**Chúc bạn ghi chi tiêu vui vẻ! 💰📊**
