require("dotenv").config(); // Load biến môi trường từ file .env
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");

const app = express();
const port = 3000;
const SECRET_KEY = "jahsjkiojwejkdfnlkjaslkjskda";

app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use(cors());
app.use(bodyParser.json());

// PostgreSQL Pool
const pool = new Pool({
  user: "postgres",
  host: "172.23.171.186",  // ip của wsl (ubuntu)
  // host: "localhost", // nếu chạy trên máy local thì dùng localhost
  database: "ttnt",
  password: "051203",
  port: 5432,
});

// Middleware xác thực JWT (để bv cho các api cần đăng nhập thì mới truy cạp đc)
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Phiên đã hết hạn, vui lòng đăng nhập lại" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY); // giải mã token
    req.user = decoded;
    req.userId = decoded.id; 
    next();
  } catch (error) {
    return res.status(401).json({ error: "Phiên đã hết hạn, vui lòng đăng nhập lại" });
  }
};



// Đăng ký
app.post("/api/dangky", async (req, res) => {
  const { hoten, sdt, email, matkhau, username } = req.body;

    // Kiểm tra định dạng email
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Địa chỉ email không hợp lệ" });
  }

  // // Kiểm tra định dạng số điện thoại
  // const phoneRegex = /^0[1-9]{7,10}$/; // $ để ktr chuỗi chính xác k có ký tự thừa các kiểu
  // if (!phoneRegex.test(phone)) {
  //   return res.status(400).json({ error: "Số điện thoại không hợp lệ" });
  // }
  try {
     // Kiểm tra xem tên đăng nhập đã tồn tại chưa
    const result = await pool.query("SELECT * FROM nguoidung WHERE username = $1", [username]);
if (result.rows.length > 0) {
  return res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });
}

    //hash mk
    const hashedPassword = await bcrypt.hash(matkhau, 10);
    //thêm ng dùng vào csdl
   await pool.query(
  "INSERT INTO nguoidung (username, hoten, sdt, email, matkhau) VALUES ($1, $2, $3, $4, $5)",
  [username, hoten, sdt, email, hashedPassword]
);

    res.status(201).json({ message: "Đăng ký người dùng thành công" });
  } catch (err) {
  console.error('Lỗi khi đăng ký người dùng:', err.message);
  res.status(500).json({ error: "Lỗi máy chủ, vui lòng thử lại sau" });
}

});



// Đăng nhập
app.post("/api/dangnhap", async (req, res) => {
  const { username, matkhau } = req.body;
  const result = await pool.query(
    "SELECT * FROM nguoidung WHERE TRIM(LOWER(username)) = LOWER(TRIM($1))",
    [username]
  );

  if (result.rows.length === 0)
    return res.status(401).json({ error: "Không tìm thấy người dùng" });

  const user = result.rows[0];
  const match = await bcrypt.compare(matkhau, user.matkhau);
  if (!match) return res.status(401).json({ error: "Sai mật khẩu" });

  const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: "1h" });
  res.json({ token, userId: user.id  });
});

//ds địa chỉ
app.get('/api/diachi', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM diachi WHERE user_id = $1 ORDER BY macdinh DESC, id ASC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi khi lấy địa chỉ' });
  }
});

//thêm địa chỉ mới
app.post('/api/diachi', verifyToken, async (req, res) => {
  const { diachi, macdinh } = req.body;

  try {
    // Nếu địa chỉ mới là mặc định, cập nhật các địa chỉ khác không mặc định
    if (macdinh) {
      await pool.query(
        'UPDATE diachi SET macdinh = FALSE WHERE user_id = $1',
        [req.userId]
      );
    }

    const result = await pool.query(
      'INSERT INTO diachi (user_id, diachi, macdinh) VALUES ($1, $2, $3) RETURNING *',
      [req.userId, diachi, macdinh || false]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi khi thêm địa chỉ' });
  }
});

// edit
app.put('/api/diachi/:id', verifyToken, async (req, res) => {
  const { diachi, macdinh } = req.body;
  const { id } = req.params;

  try {
    // Kiểm tra địa chỉ thuộc về user
    const check = await pool.query(
      'SELECT * FROM diachi WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );
    if (check.rowCount === 0) return res.status(404).json({ error: 'Không tìm thấy địa chỉ' });

    // Nếu là mặc định, unset các cái khác
    if (macdinh) {
      await pool.query(
        'UPDATE diachi SET macdinh = FALSE WHERE user_id = $1',
        [req.userId]
      );
    }

    await pool.query(
      'UPDATE diachi SET diachi = $1, macdinh = $2 WHERE id = $3',
      [diachi, macdinh || false, id]
    );
    res.json({ message: 'Cập nhật địa chỉ thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi khi cập nhật địa chỉ' });
  }
});


 //xóa địa chỉ
app.delete('/api/diachi/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM diachi WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Địa chỉ không tồn tại hoặc không thuộc về bạn' });
    }

    res.json({ message: 'Đã xóa địa chỉ thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi khi xóa địa chỉ' });
  }
});

// xem thông tin acc của mình
app.get('/api/taikhoan', verifyToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, username, hoten, email, sdt FROM nguoidung WHERE id = $1',
      [req.userId]
    );

    const diachiResult = await pool.query(
      'SELECT * FROM diachi WHERE user_id = $1 ORDER BY macdinh DESC, id ASC',
      [req.userId]
    );

    res.json({
      ...userResult.rows[0],
      diachi: diachiResult.rows, // Trả về toàn bộ danh sách địa chỉ
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi lấy dữ liệu người dùng' });
  }
});


// cập nhật thông tin acc
app.put('/api/taikhoan', verifyToken, async (req, res) => {
  const { username, hoten, sdt, email, matkhau } = req.body;

  try {
    let query = '';
    let values = [];

    if (matkhau) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(matkhau, salt);
      query = `
        UPDATE nguoidung 
        SET username = $1, hoten = $2, email = $3, sdt = $4, matkhau = $5
        WHERE id = $6
      `;
      values = [username, hoten, email, sdt, hashedPassword, req.userId];
    } else {
      query = `
        UPDATE nguoidung 
        SET username = $1, hoten = $2, email = $3, sdt = $4
        WHERE id = $5
      `;
      values = [username, hoten, email, sdt, req.userId];
    }

    await pool.query(query, values);

    res.json({ message: 'Đã cập nhật người dùng thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi khi cập nhập người dùng' });
  }
});

//xem tất cả sản phẩm ở home
app.get('/api/sanpham', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
SELECT DISTINCT ON (sp.id)
  sp.id,
  sp.ten AS ten_san_pham,
  sp.gia,
  sp.soluong,
  sp.danhmuc_id,
  COALESCE(ha.image_path, 'https://example.com/default-image.jpg') AS anh_dai_dien
FROM sanpham sp
LEFT JOIN hinhanh_sanpham ha ON sp.id = ha.sanpham_id
ORDER BY sp.id, ha.id;


    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi lấy dữ liệu sản phẩm' });
  }
});

//chi tiết sản phẩm
app.get('/api/sanpham/:id', verifyToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID sản phẩm không hợp lệ' });
  }
  try {
    const sanpham = await pool.query(`
      SELECT * FROM sanpham WHERE id = $1
    `, [id]);

    const hinhanh = await pool.query(`
      SELECT image_path FROM hinhanh_sanpham WHERE sanpham_id = $1
    `, [id]);

    if (sanpham.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    }

    res.json({
      ...sanpham.rows[0],
      hinhanh: hinhanh.rows.map(h => h.image_path)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// xem danh mục tại trang chủ
app.get("/api/danhmuc", verifyToken, async (req, res) => {
  // console.log("API /api/danhmuc được gọi");

  try {
    const result = await pool.query("SELECT * FROM danhmuc");
    // console.log("Số lượng danh mục:", result.rows.length);
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi SQL:", err);
    res.status(500).json({ error: "Lỗi khi lấy danh mục" });
  }
});


// xem giỏ hàng 
app.get("/api/giohang", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(
      "SELECT * FROM giohang WHERE user_id = $1",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi khi lấy giỏ hàng" });
  }
});

// thêm sản phẩm vào giỏ hàng
app.post("/api/giohang", verifyToken, async (req, res) => { 
    const { sanpham_id, soluong } = req.body;
    const userId = req.userId;
    
    try {
        // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
        const existingItem = await pool.query(
        "SELECT * FROM giohang WHERE  user_id = $1 AND sanpham_id = $2",
        [userId, sanpham_id]
        );
    
        if (existingItem.rows.length > 0) {
        // Nếu đã có, cập nhật số lượng
        await pool.query(
            "UPDATE giohang SET soluong = soluong + $1 WHERE user_id = $2 AND sanpham_id = $3",
            [soluong, userId, sanpham_id]
        );
        } else {
        // Nếu chưa có, thêm mới
        await pool.query(
            "INSERT INTO giohang ( user_id, sanpham_id, soluong) VALUES ($1, $2, $3)",
            [userId, sanpham_id, soluong]
        );
        }
        res.status(201).json({ message: "Sản phẩm đã được thêm vào giỏ hàng" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi khi thêm sản phẩm vào giỏ hàng" });
    }
    });

// xóa sản phẩm khỏi giỏ hàng
app.delete("/api/giohang/:id", verifyToken, async (req, res) => {
  const itemId = req.params.id;
    const userId = req.userId;
    try {
    // Xóa sản phẩm khỏi giỏ hàng
    const result = await pool.query(
        "DELETE FROM giohang WHERE id = $1 AND user_id = $2",
        [itemId, userId]
        );
 
    res.json({ message: "Sản phẩm đã được xóa khỏi giỏ hàng" });
    } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi khi xóa sản phẩm khỏi giỏ hàng" });
    }   
});


// đặt hàng
app.post("/api/dat_hang", verifyToken, async (req, res) => {
  const { items, tongtien, diachi_id } = req.body;
  const user_id = req.userId;

  try {
    // Tạo đơn hàng
    const result = await pool.query(
      `INSERT INTO dathang (user_id, ngaydat, trangthai, tongtien, hinhthuc_thanhtoan, diachi_id)
       VALUES ($1, NOW(), 'choxuly', $2, 'cod', $3) RETURNING *`,
      [user_id, tongtien, diachi_id]
    );

    const order = result.rows[0];
    const dathang_id = order.id;

    // Thêm chi tiết đơn hàng
    for (const item of items) {
      await pool.query(
        "INSERT INTO chitietdathang (dathang_id, sanpham_id, soluong, dongia) VALUES ($1, $2, $3, $4)",
        [dathang_id, item.sanpham_id, item.soluong, item.dongia]
      );
    }

    // Trừ kho
    for (const item of items) {
      const checkResult = await pool.query(
        "SELECT soluong FROM sanpham WHERE id = $1",
        [item.sanpham_id]
      );
      const soluongTrongKho = checkResult.rows[0]?.soluong ?? 0;

      if (soluongTrongKho < item.soluong) {
        return res.status(400).json({
          error: `Sản phẩm ${item.sanpham_id} không đủ hàng trong kho`,
        });
      }

      await pool.query(
        "UPDATE sanpham SET soluong = soluong - $1 WHERE id = $2",
        [item.soluong, item.sanpham_id]
      );
    }

    // Gửi thông báo
    await pool.query(
      "INSERT INTO thongbao (user_id, dathang_id, noidung) VALUES ($1, $2, $3)",
      [user_id, dathang_id, `Bạn đã đặt hàng thành công. Mã đơn hàng: #${dathang_id}`]
    );

    // Lấy chi tiết sản phẩm của đơn hàng vừa đặt
    const details = await pool.query(
      `SELECT ct.sanpham_id, 
      sp.ten AS ten_san_pham, 
      ct.soluong, ct.dongia
       FROM chitietdathang ct
       JOIN sanpham sp ON ct.sanpham_id = sp.id
       WHERE ct.dathang_id = $1`,
      [dathang_id]
    );

    // Trả về cả order + items
    res.status(201).json({
      message: "Đặt hàng thành công",
      order: {
        ...order,
        items: details.rows,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi khi đặt hàng" });
  }
});



// api huỷ đơn hàng
app.delete("/api/huy_don_hang/:id", verifyToken, async (req, res) => {
  const dathang_id = req.params.id;
  const user_id = req.userId;
  const { lydo } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Thêm thông báo
    await client.query(
      "INSERT INTO thongbao (user_id, dathang_id, noidung) VALUES ($1, $2, $3)",
      [user_id, dathang_id, `Bạn đã huỷ đơn hàng #${dathang_id}`]
    );

    // Cập nhật trạng thái đơn hàng
    const result = await client.query(
      "UPDATE dathang SET trangthai = $1 WHERE id = $2 AND user_id = $3",
      ['dahuy', dathang_id, user_id]
    );

    // Cộng lại số lượng vào kho
    const spResult = await client.query(
      "SELECT sanpham_id, soluong FROM chitietdathang WHERE dathang_id = $1",
      [dathang_id]
    );
    for (const sp of spResult.rows) {
      await client.query(
        "UPDATE sanpham SET soluong = soluong + $1 WHERE id = $2",
        [sp.soluong, sp.sanpham_id]
      );
    }

    // Thêm vào bảng lichsuhuy
    await client.query(
      `INSERT INTO lichsuhuy (user_id, dathang_id, ngayhuy, lydo) 
       VALUES ($1, $2, NOW(), $3)`,
      [user_id, dathang_id, lydo || null]
    );

    // Kiểm tra nếu không có dòng nào được cập nhật
    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    await client.query("COMMIT");
    res.json({ message: "Đơn hàng đã được huỷ và thông báo đã được gửi" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Lỗi khi huỷ đơn hàng" });
  } finally {
    client.release();
  }
});


// xem thông báo
app.get("/api/thongbao", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM thongbao WHERE user_id = $1 ORDER BY created_at DESC",
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi khi lấy thông báo" });   
  }
});

// Đánh dấu thông báo là đã đọc XEM XÉT KH CẦN 
// app.put("/api/thongbao/:id/read", verifyToken, async (req, res) => {
//   try {
//     await pool.query(
//       "UPDATE thongbao SET is_read = TRUE WHERE id = $1 AND user_id = $2",
//       [req.params.id, req.userId]
//     );
//     res.json({ message: "Đã đánh dấu là đã đọc" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Lỗi khi cập nhật thông báo" });
//   }
// });


// xem chi tiết đặt hàng
// app.get("/api/chi_tiet_don_hang/:id", verifyToken, async (req, res) => {
//   const dathang_id = req.params.id;
//   try {
//     const result = await pool.query(
//       "SELECT * FROM chitietdathang WHERE dathang_id = $1",
//       [dathang_id]
//     );
//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "Không tìm thấy chi tiết đơn hàng" });
//     }
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Lỗi khi lấy chi tiết đơn hàng" });
//   }
// });
 
// theo dõi đơn hàng - chi tiết đơn hàng
app.get("/api/chi_tiet_don_hang/:id", verifyToken, async (req, res) => {
  const userId = req.userId; // lấy từ token

  try {
    const result = await pool.query(
      `
     SELECT 
  dh.id AS dathang_id,
  dh.ngaydat,
  dh.trangthai,
  dh.tongtien,
  dh.hinhthuc_thanhtoan,

  sp.ten AS tensanpham,
  ctdh.soluong,
  ctdh.dongia,
  (ctdh.soluong * ctdh.dongia) AS thanhtien,

  u.username,
  u.sdt,
  d.diachi

FROM dathang dh
JOIN chitietdathang ctdh ON ctdh.dathang_id = dh.id
JOIN sanpham sp ON sp.id = ctdh.sanpham_id
JOIN nguoidung u ON u.id = dh.user_id
LEFT JOIN diachi d ON d.id = dh.diachi_id

WHERE dh.user_id = $1
AND dh.trangthai IN ('choxuly', 'dangchuanbi', 'danggiao', 'hoanthanh', 'dahuy') 
ORDER BY dh.ngaydat DESC

      `,
      [userId] // đây là $1
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể lấy danh sách đơn hàng" });
  }
});


//xem timeline trạng thái từng đơn hàng
app.get("/api/lich_su_dat_hang/:dathangId", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { dathangId } = req.params;

    const result = await pool.query(
  `SELECT 
  CASE 
    WHEN ld.trangthai::text = 'dangchuanbi' THEN N'Đang chuẩn bị'
    WHEN ld.trangthai::text = 'danggiao' THEN N'Đang giao'
    WHEN ld.trangthai::text = 'hoanthanh' THEN N'Hoàn thành'
    ELSE ld.trangthai::text
  END AS trangthai,
  ld.thoigian
FROM lichsudathang ld
JOIN dathang dh ON dh.id = ld.dathang_id
WHERE dh.user_id = $1 AND dh.id = $2
ORDER BY ld.thoigian ASC
`,
  [userId, dathangId]
);


    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi khi lấy chi tiết lịch sử đơn hàng" });
  }
});

// xem lịch sử đặt hàng
app.get("/api/lich_su_dat_hang", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT dh.id as dathang_id, dh.ngaydat, dh.tongtien,
              sp.ten AS tensanpham,
              dh.hinhthuc_thanhtoan,
              ct.dongia, ct.soluong,
              u.username, u.sdt, d.diachi
       FROM dathang dh
       JOIN lichsudathang ld ON ld.dathang_id = dh.id
       JOIN chitietdathang ct ON ct.dathang_id = dh.id
       JOIN sanpham sp ON sp.id = ct.sanpham_id
       JOIN nguoidung u ON u.id = dh.user_id
       JOIN diachi d ON d.user_id = u.id AND d.macdinh = true
       WHERE dh.user_id = $1
         AND ld.trangthai = 'hoanthanh'
       ORDER BY dh.ngaydat DESC, ld.thoigian ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi khi lấy lịch sử đặt hàng" });
  }
});



// xem lịch sử hủy đơn hàng 
app.get('/api/lich_su_huy_don_hang', verifyToken, async (req, res) => {
  const user_id = req.userId;
  try {
    const result = await pool.query(`
      SELECT lh.*, 
       sp.ten AS tensanpham, 
       ct.dongia, 
       ct.soluong, 
       dh.tongtien,
       u.username, 
       u.sdt, 
       d.diachi,
       lh.lydo
FROM lichsuhuy lh
JOIN dathang dh ON dh.id = lh.dathang_id
JOIN chitietdathang ct ON ct.dathang_id = lh.dathang_id
JOIN sanpham sp ON sp.id = ct.sanpham_id
JOIN nguoidung u ON u.id = lh.user_id
JOIN diachi d ON d.user_id = u.id
WHERE lh.user_id = $1
ORDER BY lh.ngayhuy DESC;
    `, [user_id]);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi khi lấy lịch sử huỷ đơn hàng' });
  }
});


// xem lịch sử tìm kiếm trên chatbot
app.get("/api/lich_su_tim_kiem", verifyToken, async (req, res) => {
  try {
    const userId = req.userId; // Lấy từ middleware verifyToken
    const result = await pool.query(
      "SELECT * FROM lichsutimkiemai WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi lấy lịch sử:", err);
    res.status(500).json({ error: "Lỗi khi lấy lịch sử tìm kiếm" });
  }
});

// Gọi Flask API để lấy embedding
app.post("/api/embed", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const response = await axios.post("http://localhost:5000/embed", { text });
    res.json(response.data);
  } catch (error) {
    console.error("Embed error:", error.message);
    res.status(500).json({ error: "Embedding failed" });
  }
});

// Gọi Flask API để lấy phản hồi chatbot
app.post("/api/chat", verifyToken, async (req, res) => {
  try {
    const userId = req.userId; 
    const { prompt } = req.body;

    const response = await axios.post("http://localhost:5000/chat", {
      prompt,
      user_id: userId, 
    });

    res.json(response.data); // { response: "..." }
  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(500).json({ error: "Chat failed" });
  }
});

app.post("/api/faq", verifyToken, async (req, res) => {
  const { question, answer } = req.body;
  try {
    // Gọi Flask để lấy embedding
    const embedRes = await axios.post("http://localhost:5000/embed", { text: question });
    const embedding = embedRes.data.embedding;

    // Lưu vào PostgreSQL
    await pool.query(`
      INSERT INTO faq (question, answer, embedding)
      VALUES ($1, $2, $3)
    `, [question, answer, embedding]);

    res.status(201).json({ message: "FAQ added successfully" });
  } catch (error) {
    console.error("Add FAQ error:", error.message);
    res.status(500).json({ error: "Failed to add FAQ" });
  }
});


app.listen(3000, '0.0.0.0', () => {
  console.log('Server is running');
});
