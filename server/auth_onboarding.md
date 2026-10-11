# TÀI LIỆU TÍCH HỢP HỆ THỐNG XÁC THỰC & KHẢO SÁT ĐẦU VÀO (AUTH & ONBOARDING)
**Dự án:** ThinkUp - Nền tảng học lập trình trực tuyến  
**Đối tượng sử dụng:** Frontend Developer (Angular), Backend Developer, QA/Tester  
**Phiên bản:** 2.0 (Cập nhật đầy đủ theo Cơ sở dữ liệu MongoDB Atlas thực tế)  

---

# MỤC LỤC
- [QUY ƯỚC CHUNG & HƯỚNG DẪN TÍCH HỢP](#quy-ước-chung--hướng-dẫn-tích-hợp)
- [PHẦN 1: TÀI LIỆU API (API SPECIFICATION)](#-phần-1-tài-liệu-api-api-specification)
  - [1.1. Module Đăng Ký Học Viên (Sign Up)](#11-module-đăng-ký-học-viên-sign-up)
  - [1.2. Module Đăng Nhập & Phiên Làm Việc (Sign In)](#12-module-đăng-nhập--phiên-làm-việc-sign-in)
  - [1.3. Module Quên & Đặt Lại Mật Khẩu (Forgot Password)](#13-module-quên--đặt-lại-mật-khẩu-forgot-password)
  - [1.4. Module Khảo Sát Đầu Vào Học Viên (Onboarding Survey)](#14-module-khảo-sát-đầu-vào-học-viên-onboarding-survey)
  - [1.5. Bảng Tổng Hợp Toàn Bộ API Endpoints](#15-bảng-tổng-hợp-toàn-bộ-api-endpoints)
- [PHẦN 2: MÔ TẢ CÁC HÀM BACKEND LIÊN QUAN (BACKEND FUNCTION REFERENCE)](#-phần-2-mô-tả-các-hàm-backend-liên-quan-backend-function-reference)
  - [2.1. Module Đăng Ký (`signup.user.js`)](#21-module-đăng-ký-signupuserjs)
  - [2.2. Module Đăng Nhập (`signin.user.js`)](#22-module-đăng-nhập-signinuserjs)
  - [2.3. Module Quên Mật Khẩu (`forgot-password.user.js`)](#23-module-quên-mật-khẩu-forgot-passworduserjs)
  - [2.4. Module Khảo Sát Onboarding (`onboarding.user.js`)](#24-module-khảo-sát-onboarding-onboardinguserjs)
  - [2.5. Bảng Tra Cứu Tóm Tắt Các Hàm Backend](#25-bảng-tra-cứu-tóm-tắt-các-hàm-backend)

---

# QUY ƯỚC CHUNG & HƯỚNG DẪN TÍCH HỢP

1. **Base URL Backend (Dự kiến):**
   - API Auth: `http://localhost:5000/api/auth`
   - API User & Onboarding: `http://localhost:5000/api/user`
2. **Cổng Client Angular:** `http://localhost:4200`
3. **Định dạng dữ liệu:** Mọi yêu cầu gửi lên (Request) và phản hồi về (Response) đều sử dụng chuẩn `Content-Type: application/json`.
4. **Xác thực phiên (Authorization Header):**
   Đối với các endpoint yêu cầu học viên đã đăng nhập, Frontend bắt buộc phải đính kèm Header:
   ```http
   Authorization: Bearer <accessToken>
   ```
5. **Cờ Onboarding (`onboarding_completed`):**
   - Mọi tài khoản học viên mới tạo (qua Form, Google hay Facebook) đều có mặc định: `onboarding_completed: false`.
   - **Frontend Routing Rule:** Sau khi đăng nhập thành công:
     - Nếu `user.onboarding_completed === false` ➔ Điều hướng thẳng vào **Khảo sát Onboarding 3 bước (`/onboarding`)**, không đẩy về Trang chủ.
     - Nếu `user.onboarding_completed === true` ➔ Điều hướng về **Trang chủ (`/`)** hoặc trang trước đó (`returnUrl`).
6. **Bảo mật phản hồi:** Mọi mật khẩu băm (`password_hash`), token nội bộ hoặc thông tin nhạy cảm đều được loại bỏ trước khi gửi về Client.

---

# 📘 PHẦN 1: TÀI LIỆU API (API SPECIFICATION)

---

## 1.1. Module Đăng Ký Học Viên (Sign Up)

### 1.1.1. Đăng ký tài khoản mới qua Email & Mật khẩu
- **Endpoint:** `POST /api/auth/register`
- **Mục đích:** Đăng ký tài khoản học viên mới với form 5 trường thông tin và xác nhận Điều khoản.
- **Yêu cầu Token:** Không.
- **Request Body:**
  ```json
  {
    "fullName": "Nguyễn Văn A",
    "phone": "0912345678",
    "email": "nguyenvana@gmail.com",
    "password": "Password123!",
    "confirmPassword": "Password123!",
    "termsAccepted": true
  }
  ```
  | Trường | Kiểu | Bắt buộc | Quy tắc kiểm tra (Validation) |
  | :--- | :--- | :---: | :--- |
  | `fullName` | `string` | Có | 2–50 ký tự, chỉ gồm chữ cái tiếng Việt/Anh và khoảng trắng. Cấm số và ký tự đặc biệt. |
  | `phone` | `string` | Có | Đúng 10 chữ số, bắt đầu bằng các đầu số di động Việt Nam: `03`, `05`, `07`, `08`, `09`. |
  | `email` | `string` | Có | Đúng định dạng email RFC 5322, không chứa khoảng trắng. |
  | `password` | `string` | Có | 8–64 ký tự, có đủ 4 yếu tố: chữ hoa, chữ thường, chữ số, ký tự đặc biệt. |
  | `confirmPassword` | `string` | Có | Khớp chính xác 100% với `password`. |
  | `termsAccepted` | `boolean` | Có | Phải là `true` (đã tích checkbox đồng ý điều khoản). |

- **Response thành công (`201 Created` / `200 OK`):**
  ```json
  {
    "message": "Vui lòng bấm vào link xác thực được gửi qua email để kích hoạt tài khoản",
    "email": "nguyenvana@gmail.com"
  }
  ```
- **Xử lý lỗi phía Frontend:**
  | HTTP Status | Mã lỗi (`field` / `code`) | Ý nghĩa & Hành vi Frontend |
  | :---: | :--- | :--- |
  | `400` | `field: "fullName"` | Sai định dạng họ tên ➔ Viền đỏ ô Họ và tên, hiển thị lỗi bên dưới. |
  | `400` | `field: "phone"` | SĐT sai quy chuẩn ➔ Báo lỗi số điện thoại không hợp lệ. |
  | `400` | `field: "email"` | Email sai định dạng ➔ Viền đỏ ô Email. |
  | `400` | `field: "password"` | Mật khẩu chưa đủ 4 yếu tố ➔ Hiện danh sách yêu cầu còn thiếu dưới ô Mật khẩu. |
  | `400` | `field: "confirmPassword"` | Mật khẩu xác nhận không khớp ➔ Báo đỏ dòng xác nhận mật khẩu. |
  | `400` | `field: "terms"` | Chưa đồng ý điều khoản ➔ Hiển thị thông báo yêu cầu tích chọn điều khoản. |
  | `409` | `EMAIL_EXISTS` | Email đã có trên hệ thống ➔ Hiện thông báo: *"Email này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng email khác!"*. |
  | `409` | `PHONE_EXISTS` | Số điện thoại đã đăng ký ➔ Hiện thông báo: *"Số điện thoại này đã được đăng ký!"*. |

---

### 1.1.2. Xác thực kích hoạt tài khoản qua Liên kết Email
- **Endpoint:** `GET /api/auth/verify?token=<verificationToken>`
- **Mục đích:** Kích hoạt tài khoản khi người dùng nhấp vào link trong email xác thực (Liên kết có hiệu lực trong vòng 12 giờ).
- **Yêu cầu Token:** Không.
- **Query Params:** `token` (chuỗi JWT token).
- **Response thành công (`200 OK`):**
  ```json
  {
    "message": "Kích hoạt tài khoản thành công! Vui lòng đăng nhập để bắt đầu học tập.",
    "email": "nguyenvana@gmail.com"
  }
  ```
  *Hành vi Frontend:* Hiển thị màn hình thông báo kích hoạt thành công, điều hướng học viên về `/login`, điền sẵn email vào ô đăng nhập.
- **Mã lỗi:**
  - `400 TOKEN_EXPIRED`: Liên kết đã hết hạn (quá 12 giờ). Frontend gợi ý nút *"Gửi lại liên kết kích hoạt"*.
  - `400 TOKEN_INVALID`: Liên kết không hợp lệ hoặc đã bị chỉnh sửa.

---

### 1.1.3. Gửi lại liên kết xác thực (Resend Verification Link)
- **Endpoint:** `POST /api/auth/resend-verification`
- **Mục đích:** Cấp lại link kích hoạt mới 12 giờ khi người dùng chưa nhận được email hoặc link cũ hết hạn.
- **Yêu cầu Token:** Không.
- **Request Body:**
  ```json
  {
    "email": "nguyenvana@gmail.com"
  }
  ```
- **Response thành công (`200 OK`):**
  ```json
  {
    "message": "Liên kết kích hoạt mới đã được gửi về email của bạn. Vui lòng kiểm tra hộp thư (hiệu lực 12 giờ).",
    "email": "nguyenvana@gmail.com"
  }
  ```
- **Mã lỗi:**
  - `429 Too Many Requests`: Đang trong thời gian đếm ngược 60 giây (Cooldown chống spam) ➔ Khóa nút và đếm ngược trên giao diện.
  - `400 Bad Request`: Tài khoản đã được kích hoạt trước đó ➔ Điều hướng sang đăng nhập.
  - `404 Not Found`: Email chưa từng đăng ký trong hệ thống.

---

### 1.1.4. Đăng ký nhanh bằng Google (Just-In-Time Provisioning)
- **Endpoint:** `POST /api/auth/google/signup`
- **Mục đích:** Đăng ký tài khoản học viên nhanh chóng thông qua Google OAuth. Tự động cấp quyền `role: student`, `email_verified: true`, `onboarding_completed: false`.
- **Request Body:**
  ```json
  {
    "email": "student@gmail.com",
    "name": "Nguyễn Văn Google",
    "avatar": "https://lh3.googleusercontent.com/...",
    "providerId": "google_sub_123456"
  }
  ```
- **Response thành công (`200 OK`):**
  ```json
  {
    "message": "Đăng ký tài khoản Google thành công!",
    "accessToken": "eyJhbGciOi...",
    "user": {
      "id": "673...",
      "name": "Nguyễn Văn Google",
      "email": "student@gmail.com",
      "role": "student",
      "avatar": "https://...",
      "onboarding_completed": false,
      "email_verified": true
    }
  }
  ```
  *Hành vi Frontend:* Lưu `accessToken` vào Storage, nhận thấy `onboarding_completed === false` ➔ Điều hướng thẳng vào Khảo sát Onboarding 3 bước (`/onboarding`).

---

### 1.1.5. Đăng ký nhanh bằng Facebook
- **Endpoint:** `POST /api/auth/facebook/signup`
- **Request Body:**
  ```json
  {
    "providerId": "fb_123456",
    "email": "student@facebook.com",
    "name": "Facebook User",
    "avatar": "https://graph.facebook.com/..."
  }
  ```
- **Lưu ý đặc biệt:** Nếu tài khoản Facebook đăng ký bằng số điện thoại (không có email), API trả về lỗi `400` kèm mã `MISSING_EMAIL`.
  *Hành vi Frontend:* Mở pop-up yêu cầu học viên nhập Email để hoàn tất đăng ký ThinkUp.

---

## 1.2. Module Đăng Nhập & Phiên Làm Việc (Sign In)

### 1.2.1. Đăng nhập bằng Email & Mật khẩu
- **Endpoint:** `POST /api/auth/login`
- **Mục đích:** Xác thực học viên qua Email/Mật khẩu với hỗ trợ Ghi nhớ đăng nhập (Remember Me).
- **Yêu cầu Token:** Không.
- **Request Body:**
  ```json
  {
    "email": "nguyenvana@gmail.com",
    "password": "Password123!",
    "rememberMe": false
  }
  ```
  | Trường | Kiểu | Bắt buộc | Mô tả |
  | :--- | :--- | :---: | :--- |
  | `email` | `string` | Có | Địa chỉ email học viên (tự động cắt khoảng trắng). |
  | `password` | `string` | Có | Mật khẩu học viên (tối thiểu 8 ký tự). |
  | `rememberMe` | `boolean` | Không | `false`: phiên 24 giờ. `true`: phiên 30 ngày (cấp thêm refreshToken). |

- **Response thành công (`200 OK`):**
  ```json
  {
    "message": "Đăng nhập thành công!",
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": {
      "id": "6ab53fa7568441ba74476a8c",
      "name": "Nguyễn Văn A",
      "email": "nguyenvana@gmail.com",
      "phone": "0912345678",
      "role": "student",
      "avatar": null,
      "onboarding_completed": false,
      "email_verified": true
    }
  }
  ```
  *Hành vi điều hướng Frontend:*
  1. Nếu trên URL có tham số `?returnUrl=/khoa-hoc/123` ➔ Điều hướng về `returnUrl`.
  2. Nếu không có:
     - Nếu `user.onboarding_completed === false` ➔ Điều hướng vào `/onboarding`.
     - Nếu `user.onboarding_completed === true` ➔ Điều hướng vào Trang chủ `/`.

- **Mã lỗi Frontend cần xử lý:**
  | HTTP Status | Mã lỗi (`code`) | Thông báo hiển thị trên giao diện | Hành vi Frontend |
  | :---: | :--- | :--- | :--- |
  | `401` | `INVALID_CREDENTIALS` | *"Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!"* | Viền đỏ cả 2 ô Email và Mật khẩu, giữ nguyên text để học viên sửa. |
  | `403` | `BRUTE_FORCE_LOCKED` | *"Bạn đã nhập sai 5 lần. Vui lòng thử lại sau 15 phút hoặc sử dụng Quên mật khẩu!"* | Khóa nút Đăng nhập và hiển thị đồng hồ đếm ngược 15 phút. |
  | `403` | `ACCOUNT_SUSPENDED` | *"Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ support@thinkup.vn"* | Hiển thị thông báo đỏ cảnh báo tài khoản bị khóa vi phạm chính sách. |
  | `403` | `ACCOUNT_PENDING` | *"Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để kích hoạt tài khoản."* | Bật nút **[Gửi lại email kích hoạt]** để gọi API `resend-verification`. |

---

### 1.2.2. Đăng nhập bằng Google OAuth
- **Endpoint:** `POST /api/auth/google/login`
- **Request Body:** `{ email, name, avatar, providerId }`
- **Cơ chế Identity Linking:** Nếu tài khoản từng đăng ký bằng Email/Mật khẩu trước đó, hệ thống tự động gộp định danh Google vào tài khoản gốc mà không tạo trùng bản ghi.

---

### 1.2.3. Đăng nhập bằng Facebook
- **Endpoint:** `POST /api/auth/facebook/login`
- **Request Body:** `{ providerId, email, name, avatar }`
- Xử lý tương tự Google; nếu thiếu email thì trả mã `MISSING_EMAIL`.

---

### 1.2.4. Lấy thông tin hồ sơ học viên hiện tại (Current Profile)
- **Endpoint:** `GET /api/auth/me`
- **Header:** `Authorization: Bearer <accessToken>`
- **Response thành công (`200 OK`):**
  ```json
  {
    "user": {
      "id": "6ab53fa7568441ba74476a8c",
      "name": "Nguyễn Văn A",
      "email": "nguyenvana@gmail.com",
      "phone": "0912345678",
      "role": "student",
      "avatar": null,
      "onboarding_completed": false,
      "email_verified": true,
      "status": "active"
    }
  }
  ```

---

### 1.2.5. Xác nhận trạng thái đăng nhập cho Header & Route Guard
- **Endpoint:** `GET /api/auth/session`
- **Header:** `Authorization: Bearer <accessToken>`
- **Mục đích:** Header Component trong Angular gọi khi load trang để quyết định giao diện hiển thị:
  - Nếu `isAuthenticated: true`: Ẩn nút "Đăng nhập" / "Đăng ký", hiển thị Tên, Avatar và Dropdown menu học viên.
  - Nếu `isAuthenticated: false`: Hiển thị lại 2 nút "Đăng nhập" và "Đăng ký".
- **Response thành công (`200 OK`):**
  ```json
  {
    "isAuthenticated": true,
    "user": {
      "id": "6ab53fa7568441ba74476a8c",
      "name": "Nguyễn Văn A",
      "email": "nguyenvana@gmail.com",
      "phone": "0912345678",
      "role": "student",
      "avatar": null,
      "onboarding_completed": false,
      "email_verified": true
    }
  }
  ```
  *Khi chưa đăng nhập hoặc Token hết hạn (`200 OK`):*
  ```json
  {
    "isAuthenticated": false,
    "user": null,
    "reason": "TOKEN_EXPIRED"
  }
  ```

---

## 1.3. Module Quên & Đặt Lại Mật Khẩu (Forgot Password)

### 1.3.1. Bước 1: Yêu cầu mã OTP khôi phục mật khẩu
- **Endpoint:** `POST /api/auth/forgot-password`
- **Mục đích:** Gửi mã xác thực OTP 6 số (hiệu lực 5 phút) qua email.
- **Request Body:**
  ```json
  {
    "email": "nguyenvana@gmail.com"
  }
  ```
- **Response thành công (`200 OK`):**
  ```json
  {
    "message": "Nếu email tồn tại trên hệ thống, bạn sẽ nhận được mã xác thực.",
    "email": "nguyenvana@gmail.com",
    "maskedEmail": "n***@gmail.com"
  }
  ```
  *Bảo mật chống dò quét tài khoản:* Dù email có tồn tại hay không, hệ thống đều trả về thông điệp trung tính trên để bảo mật người dùng.  
  *Hành vi Frontend:* Hiển thị hộp thông báo chứa `maskedEmail`, chuyển sang màn hình nhập 6 ô OTP.
- **Mã lỗi:**
  - `429 Too Many Requests`: Đang trong thời gian đếm ngược 60 giây (Cooldown) ➔ Khóa nút gửi lại và đếm ngược trên UI.

---

### 1.3.2. Bước 2: Xác thực mã OTP 6 số
- **Endpoint:** `POST /api/auth/verify-forgot-otp`
- **Request Body:**
  ```json
  {
    "email": "nguyenvana@gmail.com",
    "otp": "839201"
  }
  ```
- **Response thành công (`200 OK`):**
  ```json
  {
    "message": "Xác thực OTP thành công.",
    "resetToken": "eyJhbGciOi..."
  }
  ```
  *Hành vi Frontend:* Lưu `resetToken` (có hiệu lực 10 phút) để chuyển sang màn hình Bước 3 (Đặt mật khẩu mới).
- **Mã lỗi:**
  - `400 OTP_INVALID`: *"Mã xác thực không chính xác. Vui lòng thử lại."* ➔ Viền đỏ 6 ô OTP.
  - `403 OTP_MAX_ATTEMPTS_EXCEEDED`: *"Bạn đã nhập sai mã xác thực quá 5 lần. Phiên yêu cầu đã bị hủy, vui lòng thực hiện lại từ đầu."* ➔ Đưa học viên về Bước 1.

---

### 1.3.3. Gửi lại mã OTP (Resend OTP)
- **Endpoint:** `POST /api/auth/resend-forgot-otp`
- **Request Body:** `{ "email": "nguyenvana@gmail.com" }`
- **Quy tắc:** Áp dụng đếm ngược 60s. Khi đếm về 0s, nút *[Gửi lại mã]* mới được bấm lại.

---

### 1.3.4. Bước 3: Đặt lại mật khẩu mới (Reset Password)
- **Endpoint:** `POST /api/auth/reset-password`
- **Request Body:**
  ```json
  {
    "resetToken": "eyJhbGciOi...",
    "newPassword": "NewSecurePassword123!",
    "confirmPassword": "NewSecurePassword123!"
  }
  ```
- **Response thành công (`200 OK`):**
  ```json
  {
    "message": "Thay đổi mật khẩu thành công."
  }
  ```
  *Hành vi Frontend:* Bật Modal Overlay tích xanh thông báo đổi mật khẩu thành công. Nhấn nút *[Quay về màn hình đăng nhập]* sẽ chuyển hướng về `/login`.

---

## 1.4. Module Khảo Sát Đầu Vào Học Viên (Onboarding Survey)

### 📌 Nguyên tắc cốt lõi:
1. **Không dùng bộ lọc cứng (Zero filtering out):** Khi học viên hoàn thành khảo sát, hệ thống **không loại bỏ** bất kỳ khóa học nào mà sắp xếp hiển thị theo mức độ ưu tiên 1 → 2 → 3. Các khóa không thỏa mãn sẽ xếp sau cùng (Ưu tiên 4).
2. **Nút "Bỏ qua":** Tuyệt đối **không lưu** bất kỳ câu trả lời nào vào CSDL, chỉ cập nhật cờ `onboarding_completed: true` và hiển thị danh sách khóa học theo thứ tự mặc định trong CSDL (`total_students` DESC).
3. **Ánh xạ Schema thực tế trong Database Thinkup:**
   - **Bước 1 (Nghề nghiệp mục tiêu):** `categoryId` nhận giá trị `'1'` đến `'17'` từ collection `course_categories`.
   - **Bước 2 (Kỹ năng quan tâm):** `selectedTagIds` nhận mảng từ 1 đến 3 `tag_id` từ collection `tags`.
   - **Bước 3 (Trình độ hiện tại):** `level` gồm 3 giá trị: `'beginner'`, `'intermediate'`, `'advanced'`.

---

### 1.4.1. Bỏ qua khảo sát đầu vào (Skip Onboarding)
- **Endpoint:** `POST /api/user/onboarding/skip`
- **Header:** `Authorization: Bearer <accessToken>`
- **Request Body:** Không có body (`{}`).
- **Mục đích:** Khi người dùng bấm nút *"Bỏ qua"* trên giao diện khảo sát.
- **Hành vi hệ thống:**
  - Cập nhật `onboarding_completed: true` trong collection `users`.
  - **Không lưu** bất kỳ dữ liệu nào vào collection `student_onboarding_answers`.
  - Trả về toàn bộ danh sách khóa học theo thứ tự mặc định trong CSDL.
- **Response thành công (`200 OK`):**
  ```json
  {
    "message": "Bạn đã bỏ qua khảo sát. Hiển thị toàn bộ khóa học.",
    "courses": [
      {
        "id": "6ab53f62568441ba74472ae9",
        "course_id": "5",
        "title": "Fullstack Web với React & Node.js",
        "slug": "course-5",
        "short_description": "",
        "description": "Xây dựng ứng dụng web hoàn chỉnh từ frontend đến backend...",
        "category_id": "3",
        "level": "intermediate",
        "duration_minutes": "935",
        "price": "499000.00",
        "original_price": "648000.00",
        "thumbnail_url": "https://res.cloudinary.com/...",
        "status": "published",
        "rating": "4.20",
        "total_reviews": "123",
        "total_students": "45462",
        "instructor_id": "1",
        "badge": "BEST SELLER",
        "language": "Tiếng Việt",
        "tag_ids": ["3", "7"]
      }
    ]
  }
  ```
  *Hành vi Frontend:* Điều hướng học viên thẳng về Trang chủ (`/`), cập nhật trạng thái `onboarding_completed: true` trong state của người dùng.

---

### 1.4.2. Hoàn thành & Gửi khảo sát 3 bước (Submit Onboarding)
- **Endpoint:** `POST /api/user/onboarding/submit`
- **Header:** `Authorization: Bearer <accessToken>`
- **Request Body:**
  ```json
  {
    "categoryId": "1",
    "selectedTagIds": ["3", "4"],
    "level": "beginner"
  }
  ```
  | Trường | Kiểu | Bắt buộc | Mô tả & Quy chuẩn kiểm tra |
  | :--- | :--- | :---: | :--- |
  | `categoryId` | `string` | Có | ID danh mục nghề nghiệp mục tiêu (từ `'1'` đến `'17'` theo `course_categories`). |
  | `selectedTagIds` | `string[]` | Có | Mảng chứa từ 1 đến 3 `tag_id` từ `tags` (ví dụ: `["3", "4"]`). Tự động khử trùng lặp. |
  | `level` | `string` | Có | Trình độ hiện tại, một trong ba giá trị: `'beginner'`, `'intermediate'`, `'advanced'`. |

- **Thứ tự ưu tiên sắp xếp khóa học trả về:**
  - **Ưu tiên 1:** Khớp cả `category_id` + `level` + có ít nhất 1 kỹ năng nằm trong `selectedTagIds`.
  - **Ưu tiên 2:** Khớp `category_id` + `level` (không cần khớp kỹ năng).
  - **Ưu tiên 3:** Khớp `category_id` HOẶC có ít nhất 1 kỹ năng nằm trong `selectedTagIds`.
  - **Ưu tiên 4 (Còn lại):** Tất cả khóa học còn lại, giữ thứ tự theo độ phổ biến (`total_students` DESC).

- **Response thành công (`200 OK`):**
  ```json
  {
    "message": "Hoàn tất khảo sát! Đây là danh sách khóa học được gợi ý cho bạn.",
    "preferences": {
      "categoryId": "1",
      "selectedTagIds": ["3", "4"],
      "level": "beginner"
    },
    "courses": [
      {
        "id": "6ab53f62568441ba74472ae0",
        "course_id": "1",
        "title": "Frontend ReactJS Toàn Tập",
        "slug": "frontend-reactjs-toan-tap",
        "category_id": "1",
        "level": "beginner",
        "duration_minutes": "720",
        "price": "499000.00",
        "original_price": "699000.00",
        "thumbnail_url": "https://res.cloudinary.com/...",
        "status": "published",
        "rating": "4.85",
        "total_reviews": "210",
        "total_students": "12500",
        "instructor_id": "2",
        "badge": "KHUYÊN DÙNG",
        "language": "Tiếng Việt",
        "tag_ids": ["3", "4"]
      }
    ]
  }
  ```

---

### 1.4.3. Lấy danh sách khóa học gợi ý cho Trang chủ (Get Onboarded Courses)
- **Endpoint:** `GET /api/user/onboarding/courses`
- **Header:** `Authorization: Bearer <accessToken>`
- **Mục đích:** Khi học viên mở Trang chủ (`/`):
  - Nếu đã từng làm khảo sát: Tự động sắp xếp khóa học theo sở thích đã lưu.
  - Nếu đã bấm Bỏ qua (hoặc chưa khảo sát): Trả về danh sách mặc định (`preferences: null`).
- **Response thành công (`200 OK`):**
  ```json
  {
    "preferences": {
      "categoryId": "1",
      "selectedTagIds": ["3", "4"],
      "level": "beginner"
    },
    "courses": [ ... ]
  }
  ```

---

## 1.5. Bảng Tổng Hợp Toàn Bộ API Endpoints

| STT | Phương thức | Đường dẫn API | Module | Mục đích | Token Header? |
| :---: | :---: | :--- | :---: | :--- | :---: |
| 1 | `POST` | `/api/auth/register` | Sign Up | Đăng ký tài khoản (5 trường + Điều khoản) | Không |
| 2 | `GET` | `/api/auth/verify?token=...` | Sign Up | Kích hoạt tài khoản qua link email (12h) | Không |
| 3 | `POST` | `/api/auth/resend-verification` | Sign Up | Gửi lại link kích hoạt email (cooldown 60s) | Không |
| 4 | `POST` | `/api/auth/google/signup` | Sign Up | Đăng ký nhanh bằng Google OAuth | Không |
| 5 | `POST` | `/api/auth/facebook/signup` | Sign Up | Đăng ký nhanh bằng Facebook (kiểm tra email) | Không |
| 6 | `POST` | `/api/auth/login` | Sign In | Đăng nhập Email/Mật khẩu (Remember Me) | Không |
| 7 | `POST` | `/api/auth/google/login` | Sign In | Đăng nhập Google (Tự động gộp tài khoản) | Không |
| 8 | `POST` | `/api/auth/facebook/login` | Sign In | Đăng nhập Facebook | Không |
| 9 | `GET` | `/api/auth/me` | Sign In | Lấy thông tin hồ sơ tài khoản hiện tại | **Bearer Token** |
| 10 | `GET` | `/api/auth/session` | Sign In | Kiểm tra trạng thái đăng nhập cho Header | **Bearer Token** |
| 11 | `POST` | `/api/auth/forgot-password` | Forgot Pass | Yêu cầu gửi OTP khôi phục mật khẩu (5 phút) | Không |
| 12 | `POST` | `/api/auth/verify-forgot-otp` | Forgot Pass | Xác thực 6 số OTP (sai 5 lần hủy phiên) | Không |
| 13 | `POST` | `/api/auth/resend-forgot-otp` | Forgot Pass | Gửi lại mã OTP quên mật khẩu (cooldown 60s) | Không |
| 14 | `POST` | `/api/auth/reset-password` | Forgot Pass | Cập nhật mật khẩu mới bằng `resetToken` | Không |
| 15 | `POST` | `/api/user/onboarding/skip` | Onboarding | Bỏ qua khảo sát (không lưu DB, hiện theo thứ tự gốc) | **Bearer Token** |
| 16 | `POST` | `/api/user/onboarding/submit` | Onboarding | Gửi khảo sát 3 bước (ưu tiên 1-2-3-4, không lọc cứng) | **Bearer Token** |
| 17 | `GET` | `/api/user/onboarding/courses` | Onboarding | Lấy danh sách khóa học theo khảo sát cho Trang chủ | **Bearer Token** |

---

# 📗 PHẦN 2: MÔ TẢ CÁC HÀM BACKEND LIÊN QUAN (BACKEND FUNCTION REFERENCE)

---

## 2.1. Module Đăng Ký (`server/src/user/signup.user.js`)

### 1. `validateFullName(name)`
- **Mục đích:** Kiểm tra quy chuẩn họ và tên học viên (BR-REG-02).
- **Tham số:** `name` (`string`)
- **Trả về:** `{ valid: boolean, message?: string, value?: string }`
- **Quy tắc:** Độ dài 2–50 ký tự; chỉ chấp nhận chữ cái tiếng Việt, tiếng Anh và khoảng trắng; không chứa chữ số hoặc ký tự đặc biệt.

### 2. `validatePhone(phone)`
- **Mục đích:** Kiểm tra quy chuẩn số điện thoại di động Việt Nam (BR-REG-03).
- **Tham số:** `phone` (`string`)
- **Trả về:** `{ valid: boolean, message?: string, value?: string }`
- **Quy tắc:** Đúng 10 chữ số; bắt đầu bằng một trong các đầu số: `03`, `05`, `07`, `08`, `09`.

### 3. `validateEmail(email)`
- **Mục đích:** Kiểm tra định dạng địa chỉ email (BR-REG-04).
- **Tham số:** `email` (`string`)
- **Trả về:** `{ valid: boolean, message?: string, value?: string }`
- **Quy tắc:** Chuẩn RFC 5322; không chứa khoảng trắng; tự động chuyển về chữ thường (`toLowerCase()`).

### 4. `validatePassword(password)`
- **Mục đích:** Kiểm tra độ phức tạp của mật khẩu (BR-REG-05).
- **Tham số:** `password` (`string`)
- **Trả về:** `{ valid: boolean, message?: string, value?: string }`
- **Quy tắc:** Độ dài 8–64 ký tự; phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt.

### 5. `registerUser(params, options)`
- **Mục đích:** Đăng ký tài khoản học viên mới, băm mật khẩu bằng `bcrypt` (cost factor 12), lưu vào CSDL MongoDB với trạng thái `pending`, tạo verification token và gửi email kích hoạt.
- **Tham số:**
  - `params`: `{ fullName, phone, email, password, confirmPassword, termsAccepted }`
  - `options`: `{ db?: object, skipEmail?: boolean }`
- **Trả về:** `{ message: string, email: string, verificationToken: string, verificationLink: string }`
- **Lỗi có thể phát sinh:**
  - `400`: Lỗi validation các trường (`field: "fullName" | "phone" | "email" | "password" | "confirmPassword" | "terms"`).
  - `409`: Trùng email (`code: "EMAIL_EXISTS"`) hoặc trùng SĐT (`code: "PHONE_EXISTS"`).

### 6. `verifyEmailVerificationToken({ token }, options)`
- **Mục đích:** Xác minh chuỗi JWT token gửi trong email kích hoạt; cập nhật tài khoản sang `status: "active"`, `email_verified: true`.
- **Tham số:** `{ token: string }`, `options`
- **Trả về:** `{ message: string, email: string }`
- **Lỗi:** `400` (token sai hoặc hết hạn 12h), `404` (tài khoản không tồn tại).

### 7. `resendVerificationLink({ email }, options)`
- **Mục đích:** Cấp lại link và token kích hoạt 12 giờ mới.
- **Tham số:** `{ email: string }`, `options`
- **Trả về:** `{ message: string, email: string, verificationToken: string, verificationLink: string }`
- **Lỗi:** `404` (chưa đăng ký), `400` (đã kích hoạt rồi), `429` (chưa hết thời gian chờ 60 giây).

### 8. `registerWithGoogle({ email, name, avatar, providerId }, options)`
- **Mục đích:** Đăng ký nhanh bằng Google OAuth (Just-In-Time Provisioning). Nếu chưa có tài khoản, tự động tạo mới với `role: "student"`, `email_verified: true`, `onboarding_completed: false`.
- **Trả về:** `{ message: string, token: string, user: object }`

### 9. `registerWithFacebook({ providerId, email, name, avatar }, options)`
- **Mục đích:** Đăng ký nhanh bằng Facebook OAuth.
- **Lỗi đặc biệt:** `400 MISSING_EMAIL` nếu tài khoản Facebook không trả về email.

---

## 2.2. Module Đăng Nhập (`server/src/user/signin.user.js`)

### 1. `loginWithCredentials({ email, password, rememberMe }, options)`
- **Mục đích:** Xác thực đăng nhập bằng email và mật khẩu:
  - Kiểm tra tài khoản bị tạm khóa chính sách (`ACCOUNT_SUSPENDED`).
  - Kiểm tra trạng thái kích hoạt email (`ACCOUNT_PENDING`).
  - Kiểm tra khóa Brute-force 15 phút nếu nhập sai quá 5 lần (`BRUTE_FORCE_LOCKED`).
  - So khớp mật khẩu với `bcrypt.compare`.
  - Nếu thành công: reset `failed_login_attempts = 0`, ghi nhận `last_login_at`, tạo `accessToken` (24h) và `refreshToken` (30 ngày nếu chọn `rememberMe`).
- **Trả về:** `{ message: string, accessToken: string, refreshToken?: string, user: object }`
- **Lỗi:** `401 INVALID_CREDENTIALS`, `403 BRUTE_FORCE_LOCKED`, `403 ACCOUNT_SUSPENDED`, `403 ACCOUNT_PENDING`.

### 2. `loginWithGoogle({ email, name, avatar, providerId }, options)`
- **Mục đích:** Đăng nhập qua Google. Thực hiện **Identity Linking** (nếu tài khoản đã tồn tại qua email/mật khẩu, tự động liên kết `google_id` mà không tạo trùng tài khoản).
- **Trả về:** `{ message: string, accessToken: string, user: object }`

### 3. `loginWithFacebook({ providerId, email, name, avatar }, options)`
- **Mục đích:** Đăng nhập qua Facebook với cơ chế Identity Linking tương tự Google.

### 4. `getCurrentUser(userId, options)`
- **Mục đích:** Lấy thông tin hồ sơ của tài khoản đang đăng nhập từ `users`.
- **Tham số:** `userId` (`string` ObjectId)
- **Trả về:** `{ user: object }` (Đã loại bỏ `password_hash`).

### 5. `verifyAuthSession(token, options)`
- **Mục đích:** Kiểm tra tính hợp lệ của token trong Header để trả về trạng thái phục vụ hiển thị Header và Navigation Bar.
- **Tham số:** `token` (`string`, chấp nhận cả dạng thô hoặc có tiền tố `Bearer `)
- **Trả về:**
  - Nếu hợp lệ: `{ isAuthenticated: true, user: object }`
  - Nếu không hợp lệ hoặc hết hạn: `{ isAuthenticated: false, user: null, reason: string }`

---

## 2.3. Module Quên Mật Khẩu (`server/src/user/forgot-password.user.js`)

### 1. `sendForgotPasswordOtp({ email }, options)`
- **Mục đích:** Tạo mã OTP 6 số ngẫu nhiên (hạn 5 phút), lưu vào collection `otps`, gửi email thông báo:
  - Nếu email không tồn tại trong hệ thống: vẫn trả về phản hồi thành công chung kèm `maskedEmail` (bảo mật chống dò quét tài khoản).
  - Có cơ chế Cooldown 60 giây chống spam.
- **Tham số:** `{ email: string }`, `options`
- **Trả về:** `{ message: string, email: string, maskedEmail: string }`
- **Lỗi:** `429` (trong thời gian cooldown 60s).

### 2. `verifyForgotPasswordOtp({ email, otp }, options)`
- **Mục đích:** Xác thực mã OTP 6 số:
  - Mỗi lần nhập sai sẽ tăng biến đếm `attempts`.
  - Nếu nhập sai quá 5 lần: tự động hủy bản ghi OTP, khóa phiên khôi phục (`403 OTP_MAX_ATTEMPTS_EXCEEDED`).
  - Nếu đúng OTP: xóa bản ghi OTP và cấp `resetToken` (JWT hạn 10 phút).
- **Trả về:** `{ message: string, resetToken: string }`
- **Lỗi:** `400 OTP_INVALID`, `403 OTP_MAX_ATTEMPTS_EXCEEDED`, `400 OTP_EXPIRED`.

### 3. `resendForgotPasswordOtp({ email }, options)`
- **Mục đích:** Gửi lại mã OTP mới cho người dùng sau khi hết 60 giây chờ.

### 4. `resetPasswordWithToken({ resetToken, newPassword, confirmPassword }, options)`
- **Mục đích:** Kiểm tra tính hợp lệ của `resetToken`, xác minh độ mạnh mật khẩu mới, băm mật khẩu bằng `bcrypt` và cập nhật vào CSDL `users`.
- **Tham số:** `{ resetToken, newPassword, confirmPassword }`, `options`
- **Trả về:** `{ message: string }`
- **Lỗi:** `400` (token hết hạn, mật khẩu < 8 ký tự, hoặc mật khẩu xác nhận không khớp).

---

## 2.4. Module Khảo Sát Onboarding (`server/src/user/onboarding.user.js`)

### 1. `skipOnboarding(userId, options)`
- **Mục đích:** Xử lý khi học viên bấm nút *"Bỏ qua"* khảo sát:
  - Cập nhật cờ `onboarding_completed: true` trong collection `users`.
  - **Tuyệt đối không lưu** bản ghi nào vào collection `student_onboarding_answers`.
  - Lấy toàn bộ khóa học có `status: "published"`, sắp xếp theo thứ tự mặc định trong CSDL (`total_students` DESC).
- **Tham số:** `userId` (`string`), `options`
- **Trả về:** `{ message: string, courses: Array<object> }`
- **Lỗi:** `401` (chưa đăng nhập), `400` (userId không hợp lệ), `404` (tài khoản không tồn tại).

### 2. `submitOnboarding(userId, surveyAnswers, options)`
- **Mục đích:** Xử lý khi học viên hoàn thành khảo sát 3 bước:
  - Kiểm tra `categoryId` thuộc danh sách hợp lệ từ `course_categories` (từ `'1'` đến `'17'`).
  - Kiểm tra `selectedTagIds` là mảng từ 1 đến 3 `tag_id` hợp lệ.
  - Kiểm tra `level` là `'beginner'`, `'intermediate'` hoặc `'advanced'`.
  - Lưu vào collection `student_onboarding_answers` (upsert theo `user_id`).
  - Cập nhật `onboarding_completed: true` trong collection `users`.
  - Lấy toàn bộ khóa học published, lookup bảng nối `course_tags` và sắp xếp ưu tiên theo thuật toán 4 cấp độ.
- **Tham số:**
  - `userId`: `string`
  - `surveyAnswers`: `{ categoryId: string, selectedTagIds: string[], level: string }`
- **Trả về:** `{ message: string, preferences: object, courses: Array<object> }`

### 3. `getOnboardingCourseList(userId, options)`
- **Mục đích:** Cung cấp danh sách khóa học cho Trang chủ:
  - Nếu học viên đã từng gửi khảo sát: tự động sắp xếp theo tiêu chí đã lưu trong `student_onboarding_answers`.
  - Nếu học viên bấm bỏ qua hoặc chưa khảo sát: trả về thứ tự mặc định (`preferences: null`).
- **Trả về:** `{ preferences: object | null, courses: Array<object> }`

### 4. Các hàm hỗ trợ nội bộ trong module:
- `fetchPublishedCoursesWithTags(db)`: Truy vấn danh sách khóa học `published` kèm lookup batch từ bảng nối `course_tags` để gắn mảng `_tag_ids` cho từng khóa học (tránh N+1 query).
- `sortCoursesByPreferences(courses, prefs)`: Thuật toán sắp xếp ưu tiên không loại bỏ cứng:
  - **Cấp 1:** Khớp `categoryId` + khớp `level` + có ít nhất 1 tag trùng `selectedTagIds`.
  - **Cấp 2:** Khớp `categoryId` + khớp `level`.
  - **Cấp 3:** Khớp `categoryId` HOẶC có tag trùng `selectedTagIds`.
  - **Cấp 4:** Các khóa học còn lại, giữ thứ tự theo `total_students` giảm dần.
- `formatCourse(course)`: Chuẩn hóa dữ liệu khóa học trả về cho Client theo đúng schema thực tế trong CSDL:
  - `id`, `course_id`, `title`, `slug`, `short_description`, `description`
  - `category_id`, `level`, `duration_minutes`, `price`, `original_price`
  - `thumbnail_url`, `status`, `rating`, `total_reviews`, `total_students`
  - `instructor_id`, `badge`, `language`, `tag_ids`

---

## 2.5. Bảng Tra Cứu Tóm Tắt Các Hàm Backend

| Tên Hàm | File Nguồn | Tham Số Đầu Vào Chính | Kết Quả Trả Về |
| :--- | :--- | :--- | :--- |
| `validateFullName` | `signup.user.js` | `name` | `{ valid, message, value }` |
| `validatePhone` | `signup.user.js` | `phone` | `{ valid, message, value }` |
| `validateEmail` | `signup.user.js` | `email` | `{ valid, message, value }` |
| `validatePassword` | `signup.user.js` | `password` | `{ valid, message, value }` |
| `registerUser` | `signup.user.js` | `{ fullName, phone, email, password, confirmPassword, termsAccepted }` | `{ message, email, verificationToken, verificationLink }` |
| `verifyEmailVerificationToken` | `signup.user.js` | `{ token }` | `{ message, email }` |
| `resendVerificationLink` | `signup.user.js` | `{ email }` | `{ message, email, verificationToken, verificationLink }` |
| `registerWithGoogle` | `signup.user.js` | `{ email, name, avatar, providerId }` | `{ message, token, user }` |
| `registerWithFacebook` | `signup.user.js` | `{ providerId, email, name, avatar }` | `{ message, token, user }` |
| `loginWithCredentials` | `signin.user.js` | `{ email, password, rememberMe }` | `{ message, accessToken, refreshToken, user }` |
| `loginWithGoogle` | `signin.user.js` | `{ email, name, avatar, providerId }` | `{ message, accessToken, user }` |
| `loginWithFacebook` | `signin.user.js` | `{ providerId, email, name, avatar }` | `{ message, accessToken, user }` |
| `getCurrentUser` | `signin.user.js` | `userId` | `{ user }` |
| `verifyAuthSession` | `signin.user.js` | `token` | `{ isAuthenticated, user, reason? }` |
| `sendForgotPasswordOtp` | `forgot-password.user.js` | `{ email }` | `{ message, email, maskedEmail }` |
| `verifyForgotPasswordOtp` | `forgot-password.user.js` | `{ email, otp }` | `{ message, resetToken }` |
| `resendForgotPasswordOtp` | `forgot-password.user.js` | `{ email }` | `{ message, email, maskedEmail }` |
| `resetPasswordWithToken` | `forgot-password.user.js` | `{ resetToken, newPassword, confirmPassword }` | `{ message }` |
| `skipOnboarding` | `onboarding.user.js` | `userId` | `{ message, courses }` |
| `submitOnboarding` | `onboarding.user.js` | `userId, { categoryId, selectedTagIds, level }` | `{ message, preferences, courses }` |
| `getOnboardingCourseList` | `onboarding.user.js` | `userId` | `{ preferences, courses }` |
