# Thiết kế trang Check sheet

## Mục tiêu

Gộp Kho tài liệu và Cheat sheet thành một mục **Check sheet**, dùng cấu trúc điều hướng theo Day của Kho tài liệu. Người học mở một ngày để xem slide text liên quan và một phần ôn nhanh được chia từ 14 mục cheat sheet hiện có.

## Trải nghiệm

- Sidebar chỉ có một mục **Check sheet** cho tài liệu học và nội dung ôn nhanh.
- Bộ chọn ngày, sơ đồ tài liệu, lộ trình 28 ngày, trạng thái đã học, Notion và tìm kiếm tiếp tục hoạt động.
- Trong trang theo ngày, phần **Check sheet Day N** hiển thị các chủ đề liên quan ngày đang chọn thành các thẻ nhỏ có thể mở rộng. Không tải toàn bộ 14 mục cùng lúc.
- Mỗi mục nội dung có dòng nguồn nhỏ, ví dụ **Day 8 · RAG Pipeline**, đặt cạnh tiêu đề và dẫn tới phần text trích xuất của slide. Nội dung được tổng hợp hoặc lấy từ đề cũ ghi đúng nguồn tương ứng thay vì gán nhầm một slide.
- Nội dung và thứ tự ý từ cheat sheet hiện tại được giữ lại; thay đổi là cấu trúc hiển thị và gắn nguồn.

## Gắn nguồn theo ngày

Gắn từng mục con vào ngày có slide phù hợp theo chủ đề. Các nhóm nền tảng đi với Day 1; scoping với Day 2; agent với Day 3/9; prompt với Day 4; sản phẩm/UX với Day 5/6/16/18; data và production với Day 7/10/11/12/13; RAG với Day 8; evaluation với Day 14/27; metrics với Day 20/23; GTM với Day 22; economics với Day 24. Mục tổng hợp không được gán như trích dẫn trực tiếp; nó được ghi **Tổng hợp** hoặc **Đề khóa trước**.

## Kiến trúc

- Tách quy tắc ánh xạ cheat sheet sang ngày và slide thành module thuần trong `src/lib/checkSheet.ts`.
- Giữ `parseCheatSheet` làm bộ phân tích markdown hiện có; module mới nhận các section cùng slide manifest và trả về nội dung phù hợp cho ngày chọn, kèm nhãn nguồn và đường dẫn text.
- Tái sử dụng component trang Kho tài liệu, bộ chọn ngày và các lớp giao diện hiện có. Gỡ trang Cheat sheet độc lập và sidebar item trùng.
- Slide text vẫn là nguồn cục bộ; không thêm backend hoặc upload.

## Kiểm thử và nghiệm thu

- Mọi mục con có nguồn hiển thị chính xác: ngày/slide, **Tổng hợp**, hoặc **Đề khóa trước**.
- Chọn một ngày chỉ hiện các cheat items đã ánh xạ ngày đó; nhãn nguồn và liên kết trỏ đến slide text cùng ngày.
- Sidebar chỉ còn một mục **Check sheet**; chọn ngày, mở tài liệu, tìm kiếm, đánh dấu đã học và xem Notion vẫn dùng được.
- Chạy test suite, lint và production build.
