# Chợ Làng Tôi – Quản lý đơn hàng mini

Web app nhỏ gọn cho shop bán hàng qua nhóm Zalo: nhập đơn nhanh, gửi mã QR chuyển khoản đúng số tiền, xem tổng hàng cần chuẩn bị theo từng đợt.

HTML/CSS/JavaScript thuần, không cần cài đặt, không cần server. Dữ liệu lưu ngay trong trình duyệt (`localStorage`).

## Tính năng

- **Tạo đơn**: SĐT, tên, địa chỉ, ghi chú. Gõ vài số điện thoại là app gợi ý khách cũ. Bấm `+`/`−` để chọn số lượng (món tính theo kg tăng 0,5), tổng tiền tự tính.
- **Đơn hàng**: mới nhất ở trên, lọc *Chưa TT / Đã TT*, tìm theo tên/SĐT/mã đơn, xem theo đợt. Chạm nhãn trạng thái để đổi đã/chưa thanh toán.
- **Mã QR**: tạo bằng VietQR, ghi sẵn số tiền và nội dung `DH0012 TEN KHACH`. Có nút gửi ảnh QR qua Zalo và copy tin nhắn đơn hàng.
- **Thống kê**: tổng doanh thu, đã thu, còn phải thu; tổng số lượng từng món cần chuẩn bị; danh sách đóng gói theo khách. Có nút copy để gửi đi.
- **Cài đặt**: đợt hàng, món hàng và giá, tài khoản nhận tiền, sao lưu/khôi phục, xuất CSV mở bằng Excel.
- **Cài như app** (PWA): mở được cả khi mất mạng (trừ ảnh QR cần mạng).

## Việc cần làm trước khi dùng thật

1. Vào **Cài đặt → Tài khoản nhận tiền**, nhập ngân hàng, số tài khoản, tên chủ tài khoản thật. Bấm **Xem QR thử** rồi quét bằng app ngân hàng để kiểm tra.
2. Sửa danh sách **Món hàng** (đang là dữ liệu mẫu).
3. Mở app bằng **Chrome (Android)** hoặc **Safari (iPhone)**, rồi chọn *Thêm vào màn hình chính*. Không nên dùng trình duyệt bên trong Zalo vì dữ liệu ở đó có thể bị xoá.

## Lưu ý về dữ liệu

- Dữ liệu chỉ nằm trên **một máy, một trình duyệt**. Điện thoại và máy tính không tự đồng bộ với nhau.
- Xoá dữ liệu trình duyệt là mất đơn. Nên bấm **Tải bản sao lưu** sau mỗi đợt hàng và cất file vào Zalo "Cloud của tôi" hoặc Google Drive.
- Muốn chuyển sang máy khác: tải bản sao lưu ở máy cũ, rồi **Khôi phục từ file** ở máy mới.

## Chạy thử trên máy tính

```bash
npx http-server -p 8080 -c-1
```

Sau đó mở <http://localhost:8080>. Mở thẳng file `index.html` cũng dùng được, chỉ không có chế độ offline.

## Đưa lên mạng miễn phí (GitHub Pages)

1. Tạo repository mới trên GitHub, tải toàn bộ thư mục này lên (kéo thả trên web cũng được).
2. Vào **Settings → Pages**, chọn *Deploy from a branch*, nhánh `main`, thư mục `/ (root)`.
3. Sau khoảng một phút, app có địa chỉ dạng `https://<tên-tài-khoản>.github.io/<tên-repo>/`.

Mỗi lần sửa code, tăng số phiên bản `CACHE` trong `sw.js` (ví dụ `cholangtoi-v2`) để điện thoại tải bản mới.

## Cấu trúc

```
index.html          Khung giao diện 4 tab
css/style.css       Giao diện, ưu tiên điện thoại
js/store.js         Đọc/ghi dữ liệu, đơn, món, đợt, sao lưu
js/app.js           Chuyển tab, định dạng tiền, mã QR, tin nhắn đơn
js/order-form.js    Tab Tạo đơn
js/orders.js        Tab Đơn hàng
js/stats.js         Tab Thống kê
js/settings.js      Tab Cài đặt
sw.js, manifest.json, icons/   Cài như app, chạy offline
```
