# PPE Marketplace App 🛡️🛒

Ứng dụng thương mại điện tử bán **Personal Protective Equipment (PPE)** (đồ bảo hộ cá nhân) theo mô hình **marketplace tương tự Shopee**, tích hợp **AI Chatbot sử dụng từ Hugging Face** để hỗ trợ người dùng tra cứu thông tin, FAQ và tư vấn sản phẩm.

---

## 🚀 Features

### 🛍️ Marketplace
- Đăng ký / đăng nhập người dùng
- Quản lý người dùng bằng JWT
- Xem danh sách sản phẩm PPE
- Giỏ hàng và đặt hàng
- Giao tiếp Frontend ↔ Backend qua REST API

### 🤖 AI Chatbot (Hugging Face)
- Trả lời câu hỏi FAQ liên quan đến PPE
- So khớp câu hỏi bằng semantic embedding
- Lưu lịch sử truy vấn AI của người dùng
- Fallback khi không tìm thấy câu trả lời phù hợp

---

## 🧠 AI Stack & Versions

### 🔹 Embedding Model
- **Model name**: `thenlper/gte-small`
- **Source**: Hugging Face
- **Type**: Sentence Embedding
- **Vector size**: 384
- **Purpose**: Biến câu hỏi người dùng và FAQ thành vector để so sánh ngữ nghĩa

### 🔹 Chat Model
- **Model name**: `microsoft/DialoGPT-small`
- **Source**: Hugging Face
- **Type**: Causal Language Model
- **Purpose**: Sinh phản hồi hội thoại cơ bản (fallback)

### 🔹 Similarity Algorithm
- **Method**: Cosine Similarity
- **Threshold**: `0.75`
- **Logic**:
  - Nếu độ tương đồng ≥ threshold → trả lời FAQ
  - Nếu < threshold → trả lời mặc định
---

## 🧪 AI Framework & Environment

- **Python**: 3.9+
- **PyTorch**: ≥ 2.x
- **Transformers**: ≥ 4.x
- **NumPy**: ≥ 1.24
- **Flask**: ≥ 2.x
- **psycopg2**: PostgreSQL driver

> AI service chạy **local**, tự load model từ Hugging Face, **không dùng OpenAI / API trả phí**.


---

## 🧩 Công nghệ sử dụng

### Frontend (FE)
- React Native + Expo
- React Navigation
- Axios
- AsyncStorage
- Expo Auth Session
- UI components (Swiper, TabView, Vector Icons…)

### Backend (BE)
- Node.js + Express
- PostgreSQL
- JWT Authentication
- Axios
- Bcrypt
- CORS

### AI Service
- Python + Flask
- Hugging Face Transformers
- PyTorch
- PostgreSQL (psycopg2)
- Sentence Embedding + Semantic Search


---

## ⚙️ Cài đặt & chạy project

### 1️⃣ Clone repository
```bash
git clone <repo-url>
cd <repo-name>
```
### 2️⃣ Cài đặt Frontend

```bash
cd fe
npm install
npm start
```

* Chạy trên:

  1. Android Emulator
  
  2. iOS Simulator
  
  3. Web (expo start --web)

### 3️⃣ Cài đặt Backend (Node.js)

```bash 
cd be
npm install
npm run start
```

* Backend chạy mặc định tại:

```bash 
http://localhost:3000
```

### 4️⃣ Cài đặt AI Service (Flask)

* Cài thư viện Python
  
```bash 
pip install flask torch transformers psycopg2 python-dotenv numpy
```

* Tạo file .env

```bash 
DB_HOST=localhost
DB_NAME=ttnt
DB_USER=postgres
DB_PASSWORD=your_password
DB_PORT=5432
```

* Chạy AI service

```bash
python app.py
```

* AI service chạy tại:
```bash 
http://localhost:5000
```

🔌 API AI chính
* Chat AI
`POST /chat`


* Request
```bash 
{
  "prompt": "Khẩu trang N95 dùng được bao lâu?",
  "user_id": 1
}
```

* Response
```bash 
{
  "response": "Khẩu trang N95 có thể sử dụng trong ..."
}
```

* Thêm FAQ (Admin)
  
`POST /add_faq`
```bash
{
  "question": "Găng tay y tế dùng mấy lần?",
  "answer": "Găng tay y tế chỉ dùng một lần..."
}
```

🗄️ Database chính

* Bảng faq

  1. id
  
  2. question
  
  3. answer
  
  4. embedding (vector)

* Bảng lichsutimkiemai

  1. user_id
  
  2. question
  
  3. matched_faq_id
  
  4. response
  
  5. created_at

🎯 Mục tiêu dự án

  * Xây dựng ứng dụng thương mại điện tử thực tế
  
  * Ứng dụng AI vào hỗ trợ người dùng
  
  * Kết hợp Mobile App + Backend + AI Service
  
  * Phù hợp cho đồ án tốt nghiệp / demo AI / DevOps

📌 Ghi chú

  * AI hoạt động offline, không phụ thuộc API trả phí
  
  * Có thể mở rộng sang:
  
  * Recommendation system
  
  * Chat AI nâng cao
  
  * Fine-tune model
  
  * Deploy Docker / Kubernetes
