# Báo cáo ôn tập sau mỗi bài làm

## Mục tiêu

Sau khi người học nộp một phiên luyện tập hoặc thi thử, hiển thị một báo cáo dễ hiểu về câu làm sai, câu bỏ trống và câu tự luận chưa đạt đủ điểm; giải thích khoảng trống kiến thức và đề xuất nội dung cần ôn.

## Thiết kế

- Quyết định đúng/sai và điểm số tiếp tục dựa trên answer key và rubric hiện có.
- Sau khi nộp, gửi một yêu cầu tổng hợp cho AI với các câu đã chấm được, câu trả lời của người học, đáp án/gợi ý, giải thích, bẫy thường gặp và chủ đề cần ôn.
- AI không được tự chấm lại trắc nghiệm hoặc thay đổi điểm. Kết quả chỉ diễn giải vì sao câu trả lời chưa đạt, nêu lỗ hổng kiến thức và gợi ý luyện tập.
- Lưu báo cáo cùng attempt trong local storage để xem lại không phát sinh yêu cầu AI mới.
- Nếu yêu cầu AI lỗi hoặc một câu chưa có answer key/rubric, hiển thị nội dung giải thích và kiến thức ôn có sẵn; đánh dấu phần tổng hợp AI chưa khả dụng thay vì đoán kết quả.
- Các câu đúng không cần phân tích riêng; báo cáo tổng hợp nhóm chủ đề từ câu sai, bỏ trống và tự luận bị trừ điểm.

## Luồng và dữ liệu

Khi submit, ứng dụng lưu attempt và điểm hiện có trước, sau đó gọi endpoint quiz coach cho toàn bộ attempt trong một lần. Báo cáo phản hồi được gắn vào attempt; khi chấm tự luận hoàn tất, attempt được cập nhật mà không làm mất báo cáo. Báo cáo gồm tóm tắt chung, mục theo câu (question ID, phần sai, kiến thức còn thiếu, hành động ôn), và các chủ đề ưu tiên.

## Lỗi và quyền riêng tư

Nếu AI không sẵn sàng, bài vẫn được nộp và điểm vẫn xem được; UI cung cấp phân tích dự phòng từ dữ liệu ngân hàng câu hỏi. Bài làm lưu trên thiết bị như hiện tại. Nội dung câu trả lời được gửi tới dịch vụ AI sau khi người học chủ động nộp bài, cùng cơ chế hiện có cho chấm tự luận.

## Xác nhận phạm vi

Người dùng đã duyệt thiết kế trong hội thoại ngày 2026-10-21 và yêu cầu triển khai.
