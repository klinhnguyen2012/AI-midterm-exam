# Thiết kế ngân hàng 22 đề và flashcard

## Mục tiêu

Mở rộng ứng dụng ôn thi hiện có thành ngân hàng gồm 22 đề cố định để người học thử làm, đồng thời thêm flashcard học khái niệm từ cheat sheet.

## Phạm vi

- Giữ nguyên Đề 01 (`middle_test`) và Đề 02 (`vinunitest` mở rộng) như hiện tại.
- Tạo thêm 20 đề, đặt số thứ tự Đề 03 đến Đề 22.
- Mỗi đề mới có đúng 85 câu: 60 câu MCQ và 25 câu tự luận.
- Giới hạn câu trùng theo ID ở tối đa 20% giữa mọi cặp đề. Chuẩn hóa nội dung để loại câu hỏi có stem trùng hoặc gần như trùng trong cùng ngân hàng.
- Mở mục Flashcard từ sidebar. Mỗi thẻ có mặt trước dạng câu hỏi/thuật ngữ, mặt sau là định nghĩa hoặc giải thích ngắn lấy từ cheat sheet; người học lật thẻ rồi đánh dấu “Nhớ rồi” hoặc “Ôn lại”.
- Lưu thẻ đã học, lựa chọn Nhớ rồi/Ôn lại và trạng thái phiên học trong localStorage.
- Dữ liệu câu hỏi, đề, flashcard và tiến độ ở cục bộ; không tải nguồn lên dịch vụ bên ngoài.

## Nguồn và độ tin cậy

- Câu MCQ mở rộng phải bám nội dung trong dữ liệu người dùng cung cấp, có `sourceFiles` và `evidenceQuote` trỏ tới cheat sheet hoặc nguồn học liên quan.
- Đáp án do hệ thống tạo vẫn mang trạng thái `answer_proposed`; không đổi thành đáp án chuyên gia xác minh.
- Câu tự luận có gợi ý chấm hoặc rubric trong `explanation`, không chấm tự động đúng/sai.
- Đề 01 tiếp tục giữ nguyên bản OCR và không suy ra đáp án từ dấu tích trong ảnh.
- Đề 02 tiếp tục được đánh dấu là đề mở rộng, câu trả lời MCQ là đề xuất.

## Trải nghiệm người học

### Ngân hàng đề thi

Màn hình liệt kê 22 đề, mỗi thẻ cho thấy số câu, cơ cấu MCQ/tự luận và trạng thái đáp án. Chọn một đề mở phiên làm bài theo thứ tự đã lưu. Câu MCQ được đảo thứ tự phương án như hiện tại; câu tự luận lưu văn bản và chỉ được tự đối chiếu rubric. Các phiên vẫn được ghi lại ở localStorage.

### Flashcard

Sidebar có mục Flashcard. Màn hình hiển thị từng thẻ một, hỗ trợ lật trước/sau, chuyển thẻ, lọc theo chủ đề và đánh dấu Nhớ rồi/Ôn lại. Tiến độ giữ nguyên khi tải lại trang. Bộ thẻ có liên kết nguồn về cheat sheet.

## Dữ liệu và kiến trúc

- Lưu 20 ExamSet mới và các câu hỏi tham chiếu trong JSON dữ liệu cục bộ hiện được nạp bởi `examData.ts`.
- Dùng `buildExamSet` hoặc logic kiểm tra tương đương để xác nhận tổng số, cơ cấu và giới hạn overlap trước khi ghi các đề vào dữ liệu tĩnh.
- Tách model flashcard và logic tiến độ trong module riêng; UI chỉ đọc thẻ và gọi các thao tác học.
- Không sinh đề ngẫu nhiên mỗi lần mở app. Mỗi đề 03–22 là một bộ cố định, có thể tái lập và kiểm tra.

## Kiểm thử và nghiệm thu

- Kiểm tra có đúng 22 đề, các đề 01–02 được bảo toàn, và Đề 03–22 đều có đúng 85 câu với 60 MCQ và 25 tự luận.
- Kiểm tra cặp đề không vượt quá 20% câu trùng theo ID; kiểm tra stem trùng không bị chọn hai lần trong một đề.
- Kiểm tra câu mới có nguồn và trích dẫn, đáp án vẫn là đề xuất, tự luận không bị tự chấm.
- Kiểm tra flashcard lật mặt, chuyển/lọc thẻ và lưu tiến độ cục bộ.
- Chạy toàn bộ tests và production build.

## Ngoài phạm vi

- Không tuyên bố các đáp án đề xuất là đáp án chính thức.
- Không thêm đăng nhập, backend, đồng bộ đám mây hay lịch nhắc flashcard.
- Không thay đổi nội dung hoặc thứ tự của Đề 01 và Đề 02 ngoài cách hiển thị thông tin trạng thái.
