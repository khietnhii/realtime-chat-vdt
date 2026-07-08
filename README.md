# 💬 [VDT 2026] Pulse Chat - Realtime Messaging

Một ứng dụng trò chuyện trực tuyến (real-time chat) full-stack mạnh mẽ được phát triển cho mini project thuộc khuôn khổ chương trình Viettel Digital Talent 2026. Ứng dụng được thiết kế tối ưu hiệu suất, dễ dàng mở rộng ngang (scale out), và tích hợp Trí tuệ nhân tạo (AI) mang lại trải nghiệm người dùng hiện đại nhất.

🌍 **Live Demo:** [https://realtime-chat-vdt.onrender.com/](https://realtime-chat-vdt.onrender.com/)

*(Chú ý: Vì triển khai trên nền tảng Render Free Tier, máy chủ có thể mất 30-50s để khởi động nếu không có người truy cập trong một thời gian).*

## ✨ Các tính năng nổi bật

### ⚡ Cốt lõi Realtime & Tối ưu
- **Giao tiếp thời gian thực**: Nhắn tin với độ trễ thấp sử dụng Socket.IO.
- **Độ tin cậy cao**: Cơ chế ACK kết hợp với hàng đợi (Outbox queue). Tự động lưu tin nhắn khi mất mạng và tự gửi lại khi có kết nối, không mất tin hay trùng lặp (Dedup bằng `clientMsgId`).
- **Mở rộng ngang (Scalability)**: Tích hợp **Redis Adapter**, cho phép chạy nhiều server instance cùng lúc mà vẫn đảm bảo tin nhắn được fan-out chính xác.
- **Hiện diện (Presence)**: Hiển thị trạng thái Online/Offline mượt mà.

### 🤖 Tích hợp Trí tuệ Nhân tạo (AI)
- **Catch Me Up**: Tính năng tóm tắt tin nhắn tự động sử dụng **Google Gemini 1.5 Flash**. Giúp người dùng nắm bắt nhanh nội dung đoạn chat bị lỡ trong 1 giờ, 24 giờ qua hoặc theo một khoảng thời gian tuỳ chọn.

### 🎨 Trải nghiệm Người dùng (UX/UI)
- **Trình soạn thảo thông minh**: Ô nhập văn bản tự động co giãn kích thước một cách mượt mà theo nội dung.
- **Nhắc đến người dùng (Mentions)**: Hỗ trợ gõ `@` để hiển thị popup gợi ý thành viên, điều hướng bằng bàn phím.
- **Đa phương tiện (Rich Media)**: Gửi hình ảnh, video, tệp đính kèm.
- **Ghi âm trực tiếp**: Thu âm giọng nói ngay trên trình duyệt với hình ảnh visualizer trực quan.
- **Quản lý tin nhắn**: Read receipts tinh tế (Đã gửi → Đã xem).

## 🏗️ Kiến trúc Hệ thống

```mermaid
graph TD
    Client["Client (React + Zustand)"]
    REST["REST API (Express)"]
    WS["WebSocket (Socket.IO)"]
    Server["App Server (Node.js)"]
    DB[("PostgreSQL")]
    Redis[("Redis")]

    Client -- API Calls --> REST
    Client -- Realtime Events --> WS
    REST --> Server
    WS --> Server
    Server -- Lưu trữ --> DB
    Server -- Pub/Sub & Presence --> Redis
```

## 🛠️ Công nghệ sử dụng

### Frontend (`@chat/client`)
- **Framework**: React 18 với Vite
- **Ngôn ngữ**: TypeScript
- **Quản lý State**: Zustand
- **Real-time**: Socket.IO Client
- **Giao diện/UI**: Custom CSS Modules / Vanilla CSS & `emoji-picker-react`

### Backend (`@chat/server`)
- **Runtime**: Node.js & Express
- **Ngôn ngữ**: TypeScript
- **Cơ sở dữ liệu**: PostgreSQL (hỗ trợ pgvector extension)
- **ORM**: Prisma
- **Real-time**: Socket.IO với Redis Adapter
- **Xác thực (Auth)**: JSON Web Tokens (JWT) & bcryptjs
- **Upload File**: Cloudinary & Multer
- **Validation**: Zod
- **AI**: `@google/generative-ai`

### Infrastructure (Hạ tầng)
- **Containerization**: Docker & Docker Compose
- **Services**: PostgreSQL, Redis

## 📁 Cấu trúc dự án

Dự án này được tổ chức dưới dạng monorepo sử dụng npm workspaces:

```text
realtime-chat-vdt/
├── packages/
│   ├── client/         # Ứng dụng frontend React
│   ├── server/         # Backend server Node.js/Express
│   └── shared/         # Các file types và DTO dùng chung
├── docker-compose.yml  # Cấu hình hạ tầng (Postgres, Redis)
└── package.json        # Cấu hình workspace gốc
```

## ⚙️ Hướng dẫn cài đặt

### Yêu cầu hệ thống

- [Node.js](https://nodejs.org/) (Khuyến nghị phiên bản v20 trở lên)
- [Docker & Docker Compose](https://www.docker.com/)

### Cài đặt

**1. Clone repository:**
```bash
git clone <repository-url>
cd realtime-chat-vdt
```

**2. Cài đặt các dependencies:**
```bash
npm install
```

**3. Thiết lập biến môi trường:**
- Di chuyển đến thư mục `packages/server/` và copy file mẫu:
  ```bash
  cp packages/server/.env.example packages/server/.env
  ```
- File `.env` cho server sẽ có dạng như sau (đã khớp với cấu hình mặc định của Docker):
  ```env
  DATABASE_URL="postgresql://user:password@localhost:5432/chat_db?schema=public"
  REDIS_URL="redis://localhost:6379"
  PORT=4000
  JWT_SECRET="doi-thanh-mot-chuoi-bi-mat-that-dai-ngau-nhien"
  
  # Thêm API Key Google Gemini để dùng tính năng Tóm tắt
  GEMINI_API_KEY="your_gemini_api_key_here"
  
  # Cấu hình SMTP (tuỳ chọn) để gửi mã xác nhận OTP qua Email
  SMTP_HOST="smtp.gmail.com"
  SMTP_USER="your_email@gmail.com"
  SMTP_PASS="your_app_password"
  
  # Cấu hình Cloudinary (bắt buộc) để upload hình ảnh và file
  CLOUDINARY_CLOUD_NAME="your_cloud_name"
  CLOUDINARY_API_KEY="your_api_key"
  CLOUDINARY_API_SECRET="your_api_secret"
  ```

**4. Khởi chạy Hạ tầng (PostgreSQL & Redis):**
```bash
npm run infra:up
```

**5. Khởi tạo Database Schema:**
```bash
npm run db:push
npm run db:generate
```

### Chạy ứng dụng

Để chạy cả client và server cùng lúc trong môi trường phát triển:

```bash
npm run dev
```

Hoặc bạn có thể chạy từng phần riêng biệt ở 2 terminal:
- **Chạy Backend Server:** `npm run dev:server` (chạy tại cổng 4000)
- **Chạy Frontend Client:** `npm run dev:client` (chạy tại cổng 5173)

Mở trình duyệt tại địa chỉ: [http://localhost:5173](http://localhost:5173)

## 🛑 Dừng các dịch vụ Hạ tầng

Để dừng và xóa các Docker container (PostgreSQL và Redis):
```bash
npm run infra:down
```

## 📜 Các lệnh có sẵn (ở thư mục gốc)

- `npm run dev`: Chạy đồng thời frontend và backend.
- `npm run dev:server`: Chỉ khởi chạy backend server.
- `npm run dev:client`: Chỉ khởi chạy frontend client.
- `npm run infra:up`: Bật các Docker container (Postgres, Redis).
- `npm run infra:down`: Tắt các Docker container.
- `npm run db:push`: Đẩy schema của Prisma lên database.
- `npm run db:generate`: Tạo Prisma client.

## 🚀 Triển khai (Deployment)

Dự án này đã được cấu hình và triển khai thành công trên **Render**:
- **Web Service (Node.js)**: Build lệnh `npm ci && npm run build` và Start lệnh `npm run start`.
- **PostgreSQL**: Sử dụng dịch vụ Managed Database của Render.
- **Redis**: Dùng Redis instance của Render (hoặc Upstash) hỗ trợ real-time scaling.
- **Lưu trữ tĩnh**: Ảnh và tệp được quản lý bởi Cloudinary.

---
*Dự án thực hiện trong khuôn khổ Viettel Digital Talent 2026.*
