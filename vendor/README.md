# Thư viện cục bộ

Ứng dụng chỉ nạp tệp từ thư mục này; không dùng CDN khi chạy.

Các bản phân phối đã có sẵn. Chạy `python3 scripts/vendor.py` trên máy có mạng nếu cần tải lại:

- `pdfjs-dist@4.10.38`: mô-đun, worker cùng phiên bản, CMaps, phông chuẩn, tài nguyên WASM nếu có, giấy phép Apache-2.0.
- `page-flip@2.0.7`: bản phân phối mô-đun StPageFlip, giấy phép MIT.

Trình chuẩn bị kiểm tra SHA-512 của gói theo SRI từ npm qua HTTPS và mã gói cố định trong mã nguồn, rồi ghi phiên bản và SHA-256 của từng tệp vào `manifest.json`. Lệnh `python3 scripts/vendor.py --check` kiểm tra lại hoàn toàn ngoại tuyến. Giữ toàn bộ thư mục này khi sao chép ứng dụng.

**Trạng thái bàn giao:** đã xác minh SHA-256 của 192 tệp cục bộ, bao gồm tài nguyên và giấy phép. Các thư viện không bị sửa mã nguồn; ứng dụng quản lý vòng đời animation và sao chép canvas tại lớp tích hợp.
