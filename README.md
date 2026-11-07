# Sổ tay Toán học 3

Ứng dụng đọc hai tập sách PDF bằng HTML5, CSS3 và JavaScript thuần. Dành cho cô **Lan Thúy**, giáo viên sử dụng tài liệu để soạn bài và giảng dạy Toán lớp 3. Giao diện tiếng Việt, không cần tài khoản.

## 1. Chuẩn bị và chạy cục bộ

Cần Python 3.10 trở lên. Sau khi đủ thư viện, không cần Node, npm hay mạng để sử dụng.

Các thư viện cố định đã có trong `vendor/`. Khởi chạy bằng:

```bash
python3 scripts/vendor.py --check
python3 -m http.server 8000
```

Mở **http://localhost:8000**. Chạy các lệnh tại thư mục chứa `index.html`. Nếu cần khôi phục thư viện, chạy `python3 scripts/vendor.py` một lần trên máy có mạng. Trong phiên làm việc có quy tắc RTK, thêm `rtk proxy` trước lệnh.

Mã nguồn để triển khai: https://github.com/dungnguyenba816/sotaytoanhoc3. Trên Streamlit Community Cloud, chọn kho `dungnguyenba816/sotaytoanhoc3`, nhánh `main`, tệp chạy **`streamlit_app.py`**, Python **3.12**, rồi chọn Deploy. Không cần nhập token hay cấu hình secrets trong ứng dụng.

Để chạy bằng Streamlit tại máy cá nhân:

```bash
python3 -m pip install -r requirements.txt
python3 -m streamlit run streamlit_app.py
```

Lớp Streamlit phục vụ giao diện hiện có bằng thành phần tùy chỉnh; không cần mở thêm cổng máy chủ. Tài nguyên công khai được chép vào thư mục tạm riêng chỉ gồm trang HTML, ảnh, sách, mã trình duyệt và thư viện. Mã Python, cấu hình và secrets không nằm trong thư mục này. Thành phần tự điều chỉnh chiều cao theo nội dung để tránh thêm thanh cuộn dọc bên trong.

Không mở `index.html` trực tiếp bằng `file://`: mô-đun JavaScript, worker và yêu cầu tải PDF bị chính sách nguồn của trình duyệt chặn. Dùng cùng địa chỉ và cổng mỗi lần để giữ cùng vùng dữ liệu trình duyệt. Khi sao chép sang máy khác, mang theo toàn bộ thư mục ứng dụng, bao gồm `books/` và `vendor/`. Lệnh tải thư viện chỉ cần mạng ở bước chuẩn bị; lúc chạy không gọi CDN hay phông chữ bên ngoài.

## 2. Nội dung và cấu trúc thư mục

| Mã sách | Tên khóa học | Tệp gốc |
| --- | --- | --- |
| `course_1` | Sổ tay Toán học 3 - Tập 1 | `books/so_tay_toan_3_tap_1.pdf` |
| `course_2` | Sổ tay Toán học 3 - Tập 2 | `books/so_tay_toan_3_tap_2.pdf` |

Hai PDF được giữ nguyên. Số trang hiển thị lấy từ `PDFDocumentProxy.numPages` của PDF.js, không ghi cứng trong danh mục. Ảnh bìa SVG là minh họa riêng cho giao diện; trang sách luôn được vẽ trực tiếp từ PDF.

```text
index.html                Điểm vào ứng dụng
streamlit_app.py          Điểm vào cho Streamlit Community Cloud
web_bundle.py             Đóng gói riêng các tài nguyên công khai
requirements.txt          Phiên bản Streamlit cố định
.streamlit/config.toml    Cấu hình giao diện và tắt thống kê sử dụng
styles/app.css            Giao diện, bố cục đáp ứng và bộ đọc
js/app.js                 Điều hướng và tổng quan
js/courses.js             Ánh xạ hai sách
js/pdf.js                 Tải PDF và cấu hình worker cục bộ
js/reader.js              Vị trí đọc và các điều khiển
js/render-cache.js        Hàng đợi và bộ nhớ canvas
js/mouse.js               Bộ nhận con trỏ chỉ dành cho chuột
js/flip-lifecycle.js      Quản lý animation và bản sao canvas
js/storage.js             Lưu trữ có kiểm tra dữ liệu
assets/covers/            Bìa SVG riêng cho từng tập
assets/avatar.svg         Ảnh đại diện trang trí
books/                    Hai tệp PDF gốc
vendor/                   Thư viện, tài nguyên, giấy phép, mã kiểm tra
scripts/vendor.py         Tải và xác minh thư viện cố định
tests/                    Kiểm tra cấu trúc, logic và vẽ PDF
```

Giao diện bộ đọc dùng JavaScript thuần; Streamlit chỉ làm lớp phục vụ khi triển khai trực tuyến. Không có hệ thống đăng nhập, LMS, SCORM hay dịch vụ theo dõi.

## 3. Các màn hình và cách sử dụng

- **Tổng quan** (`#dashboard`): lời chào cô Lan Thúy, hai tập sách tham khảo cho việc giảng dạy, thống kê vị trí đọc và tài liệu mở gần đây. Chưa mở sách sẽ có trạng thái trống; đang kiểm tra PDF sẽ có thông báo tải.
- **Tài liệu giảng dạy** (`#courses`): hai tập tài liệu và lối quay lại trang đang xem khi chuẩn bị bài.
- **Giới thiệu** (`#about`): mục đích, nguồn nội dung và cách giữ dữ liệu.
- **Xem tài liệu** (`#reader/course_1` hoặc `#reader/course_2`): đọc PDF gốc và tiếp nối trang đã lưu.

Đường dẫn dùng phần sau dấu `#`, nên tải lại và nút Quay lại của trình duyệt hoạt động với máy chủ tĩnh. Điều hướng bên hông chuyển thành danh mục thu gọn trên màn hình nhỏ. Tên Lan Thúy và ảnh đại diện không có thao tác tài khoản.

## 4. Lật trang và điều khiển bộ đọc

Dùng **Trước / Sau**, nhấp trang bằng chuột hoặc kéo góc bằng chuột để lật có hiệu ứng uốn và bóng của StPageFlip. Bộ nhận đầu vào của thư viện bị tắt; lớp tích hợp chỉ nhận `pointerType === 'mouse'`. Không đăng ký trình xử lý cử chỉ cảm ứng. Vuốt, kéo bằng ngón tay hoặc bút không lật trang; dùng các nút, ô nhập số trang hoặc thanh chọn trang trên màn hình cảm ứng.

Bộ đọc hiển thị hai trang khi đủ rộng và một trang khi hẹp. Đổi kích thước giữ nguyên trang đang chọn. Các trang khác khổ được đặt vừa khung và giữ tỷ lệ, không cắt nội dung. Có thể phóng từ **100% đến 250%**, mỗi lần 25%; nội dung được vẽ lại theo độ phân giải mới, có giới hạn kích thước bitmap để bảo vệ bộ nhớ. Khung sách tự giãn theo chiều cao trang để không có thanh cuộn dọc bên trong. Ở mức 100%, khung sách không hiện thanh cuộn, kể cả khi chạm hoặc rê chuột vào góc trang. Chỉ khi phóng lớn hơn 100% mới cho phép thanh cuộn ngang xuất hiện nếu nội dung vượt khung; cuộn dọc vẫn bằng trang ứng dụng.

| Phím | Thao tác |
| --- | --- |
| Mũi tên trái / phải | Lật trước / sau |
| Home / End | Chọn trang đầu / cuối |
| Escape | Thoát toàn màn hình; nếu không toàn màn hình thì về tổng quan |

Các phím này không điều hướng sách khi đang thao tác với ô nhập, thanh trượt, nút, liên kết, danh sách chọn hoặc vùng chỉnh sửa. Nút toàn màn hình chỉ hiện khi trình duyệt hỗ trợ. Mục lục chỉ xuất hiện nếu PDF có các đích mục lục giải được; không tự tạo chương từ nội dung.

## 5. Vị trí đọc và quyền riêng tư

Dữ liệu nằm dưới khóa `sotaytoanhoc3.reading.v1` trong `localStorage`, riêng cho `course_1` và `course_2`:

```json
{
  "course_1": {
    "lastPage": 7,
    "totalPages": 20,
    "progress": 35,
    "lastOpenedAt": "2026-11-07T10:00:00.000Z"
  }
}
```

Đây là ví dụ định dạng, không phải số trang cố định. Trang bắt đầu từ 1; phần trăm bằng `lastPage / totalPages × 100`. Sách chưa mở có 0%. Chọn trang trực tiếp giữ đúng trang đó. Lật cả cặp lấy trang đầu cặp làm vị trí; cặp cuối dùng trang cuối PDF để đạt 100%. Quay về trang trước làm giảm phần trăm và trạng thái hoàn tất. Phần trăm không xác minh việc học, làm bài hoặc đã đọc hết từng trang.

Chỉ lưu sau khi các trang đang thấy vẽ thành công. Số trang cũ được đối chiếu với số trang thật khi mở PDF. Dữ liệu hỏng hoặc trình duyệt chặn lưu trữ sẽ có thông báo và chuyển sang giữ trong bộ nhớ phiên. Không có dữ liệu đọc gửi đi. Xóa khóa trên trong công cụ dành cho nhà phát triển để đặt lại vị trí; xóa dữ liệu trang web hoặc dùng trình duyệt khác cũng sẽ mất vị trí đã lưu.

## 6. Thư viện, hiệu năng và giấy phép

PDF.js được cố định ở `pdfjs-dist@4.10.38`, giấy phép Apache-2.0; StPageFlip ở `page-flip@2.0.7`, giấy phép MIT. `scripts/vendor.py` lấy gói npm đúng phiên bản qua HTTPS, xác minh SHA-512 theo SRI rồi chép mô-đun, worker, CMaps, phông chuẩn, các tài nguyên liên quan và giấy phép. Phiên bản cùng SHA-256 của từng tệp nằm trong `vendor/manifest.json`. Không có cơ chế tự nâng cấp lúc chạy. Giấy phép được chép vào thư mục của từng thư viện khi chuẩn bị thành công.

Mỗi trang có một khung nhẹ; chỉ vẽ cặp đang thấy và tối đa hai cặp lân cận ở mỗi hướng. Hàng đợi tối đa hai tác vụ. Ngân sách canvas là **64 MiB**: tối đa 48 MiB cho bitmap trong bộ nhớ đệm, dự phòng 16 MiB cho bản sao trang tạm của hiệu ứng; mỗi bitmap tối đa 8 MiB. Trang xa bị giải phóng. Chuyển sách hủy tải, hủy vẽ, dọn con trỏ, bộ theo dõi kích thước và animation.

Lớp tích hợp quản lý vòng đời vòng vẽ của StPageFlip 2.0.7 và chép điểm ảnh sang canvas của trang tạm khi lật ở chế độ một trang; không sửa bản phân phối thư viện.

## 7. Kiểm tra và tình trạng xác minh

Chạy kiểm tra tệp bằng Python:

```bash
python3 tests/check_files.py
python3 scripts/vendor.py --check
```

Nếu có Node hỗ trợ mô-đun hiện đại, chạy `node tests/core.test.js` hoặc `npm test`. Bộ kiểm tra logic không cần cài gói npm. Khi máy chủ đang chạy và thư viện đã chuẩn bị, mở **http://localhost:8000/tests/browser.html** rồi chọn **Chạy kiểm tra**. Trang này kiểm tra logic, đếm trang bằng PDF.js, vẽ mọi trang của cả hai tập, kiểm tra hàng đợi và bộ nhớ đệm với tài liệu giả. Bài kiểm tra dùng vùng lưu trữ giả và không sửa vị trí đọc thật.

Đợt thực hiện ngày 07/11/2026 đã chạy đạt **8 kiểm tra cấu trúc Python**, bao gồm SHA-256 của cả hai PDF gốc, tài nguyên giao diện, ánh xạ nhập mô-đun, SVG, số khóa học và không có đầu vào touch/nguồn CDN trong mã ứng dụng. Đồng thời đã xác minh SHA-256 của **192 tệp thư viện cục bộ**, đúng phiên bản cố định. Kiểm tra nguồn PDF sơ bộ thấy 20 đối tượng trang mỗi tập; đây chưa thay thế số đếm PDF.js.

**Đã kiểm tra bổ sung trước khi triển khai:** 26 kiểm tra logic JavaScript đã đạt. Kiểm tra gói tài nguyên Streamlit bằng `python3 -m unittest discover -s tests -p test_streamlit_bundle.py` xác minh PDF không thay đổi và thư mục công khai không chứa mã Python hay secrets. Bộ kiểm tra tự động trên Chrome đã xác nhận mỗi tập có 20 trang bằng PDF.js và vẽ thành công đủ 40 trang; đồng thời kiểm tra điều khiển tới/lùi, phóng to, thanh chọn trang, focus bàn phím, bỏ qua con trỏ cảm ứng, khôi phục độc lập hai tập, lỗi PDF thiếu, giới hạn hàng đợi/bộ nhớ và chọn nhanh A → B → A. Kiểm tra giao diện cũng đã đạt cho lời chào giáo viên, nội dung giới thiệu đã chỉnh sửa, ẩn thanh cuộn ở 100%, bật cuộn ngang khi phóng lớn và bố cục điện thoại không tràn ngang. Có thể chạy lại qua `tests/run_browser.cjs` nếu có Node, Playwright và Chrome. Kiểm tra trình duyệt trên máy chủ Streamlit thực tế cũng đã đạt: tải giao diện trong thành phần nhúng, tự điều chỉnh chiều cao, tải PDF và worker đúng đường dẫn, lật trang, bật/tắt thanh cuộn theo mức phóng và bố cục điện thoại. Có thể chạy lại bằng `tests/run_streamlit_browser.cjs` khi máy chủ Streamlit đang chạy.

**Chưa xác minh:** chưa kiểm tra trực quan từng chi tiết hiệu ứng kéo góc, toàn màn hình, thiết bị cảm ứng thật, đối chiếu hình ảnh thủ công và các trình duyệt Edge, Firefox, Safari. Không coi các mục này là đạt nghiệm thu.

Mục tiêu nghiệm thu là các bản Chrome, Edge, Firefox và Safari hiện hành. Sau khi chuẩn bị thư viện, kiểm tra thủ công:

- Tổng quan, hai tập tài liệu, giới thiệu, Quay lại và tải lại tại từng đường dẫn. Kiểm tra máy tính, máy tính bảng, điện thoại; không tràn ngang toàn trang, chữ rõ, Tab và viền focus dùng được.
- Mở từng tập, đi qua mọi trang, so sánh trang đại diện với PDF gốc, gồm chữ Việt, công thức, hình và bố cục. Kiểm tra trang đầu/cuối; dùng bộ kiểm tra logic cho tài liệu một trang và số trang lẻ.
- Lật tới/lùi bằng nút, nhấp và kéo các góc bằng chuột; quan sát uốn trang và bóng. Vuốt và kéo trên màn hình cảm ứng không được lật; nút và thanh trượt vẫn phải hoạt động.
- Chọn cả trang chẵn/lẻ trong một cặp, phóng các mức, đổi kích thước, đổi hướng máy và tải lại; vị trí phải giữ độc lập từng tập. Đến cặp cuối đạt 100%, quay lại giảm phần trăm.
- Dùng bàn phím và phím tắt khi focus trong/ngoài nút, ô nhập, thanh trượt; toàn màn hình nếu hỗ trợ. Kiểm tra tên và ảnh Lan Thúy không tương tác.
- Nhập JSON sai vào khóa lưu trữ, chặn lưu trữ, giả lỗi hết dung lượng; kiểm tra thông báo và dự phòng. Chuyển sách lúc đang tải, chọn trang liên tục và đổi kích thước liên tục.
- Mô phỏng 404, PDF hỏng và lỗi vẽ bằng công cụ chặn yêu cầu hoặc bản sao thử nghiệm của ứng dụng; không sửa PDF gốc. Phải có thông báo Việt và nút thử lại; không lưu vị trí chưa hiển thị.
- Sau khi tải thư viện đầy đủ, chặn mọi yêu cầu ra ngoài localhost và tải lại cả hai sách để kiểm tra hoạt động ngoại tuyến. Máy chủ cục bộ phải tiếp tục chạy.

## 8. Khắc phục sự cố và giới hạn

**Thiếu thư viện:** chạy `python3 scripts/vendor.py` trên máy có mạng. Nếu DNS hoặc tường lửa chặn npm, chuẩn bị trên một máy khác rồi chép toàn bộ `vendor/` sang. Thử lại bằng nút trong giao diện sau khi chép; nếu trình duyệt còn giữ lỗi nhập mô-đun cũ, tải lại trang.

**Không thấy sách / PDF hỏng:** kiểm tra hai đường dẫn chính xác trong bảng ánh xạ và khôi phục PDF gốc nếu cần. Nút **Mở PDF gốc** trong trạng thái lỗi giúp kiểm tra trực tiếp bằng trình duyệt; cách mở này không cập nhật vị trí đọc của ứng dụng.

**Không lưu được:** kiểm tra chế độ riêng tư, quyền lưu dữ liệu, dung lượng và địa chỉ/cổng đang dùng. Thông báo dự phòng có nghĩa vị trí chỉ tồn tại trong phiên hiện tại.

**Trang không vẽ được:** chọn **Thử lại** trên trang. Một số tài liệu hoặc thiết bị có giới hạn bộ nhớ riêng; độ nét ở mức phóng cao có thể bị giới hạn bởi ngân sách bitmap. Nội dung canvas không có lớp chọn văn bản hoặc đọc văn bản PDF bằng trình đọc màn hình; các điều khiển có nhãn và dùng bàn phím được.

Ứng dụng chạy được bằng máy chủ tĩnh cục bộ hoặc trên Streamlit Community Cloud. Không đồng bộ vị trí đọc giữa thiết bị hay giữa địa chỉ cục bộ và ứng dụng trực tuyến. Dữ liệu đọc thuộc nguồn web hiện tại. PDF và thư viện đi kèm ứng dụng; bản trực tuyến tải các tệp này từ chính ứng dụng Streamlit, không qua CDN bên ngoài.
