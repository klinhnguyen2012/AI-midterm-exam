export interface StudyGuide {
  context: string;
  explanation: string;
  example: string;
  remember: string;
}

export const studyGuides: Record<string, StudyGuide> = {
  '0-ban-o-chu-e-o-uu-tien': {
    context: 'Đây là bản đồ ôn tập: các ý P0 thường xuất hiện xuyên suốt, P1 giúp giải thích cách đưa AI vào vận hành, P2 bổ sung chiều sâu kỹ thuật và quản trị.',
    explanation: 'Học bằng cách nối khái niệm với quyết định thực tế: bài toán có hợp AI không, lấy dữ liệu nào, kiểm tra chất lượng ra sao, và chi phí có đáng không.',
    example: 'Với chatbot chính sách hoàn tiền: xác định đúng nhu cầu → truy xuất chính sách → kiểm tra câu trả lời có căn cứ → đo tỷ lệ giải quyết và chi phí mỗi yêu cầu.',
    remember: 'Ưu tiên hiểu khi nào dùng, dùng để làm gì và kiểm soát rủi ro nào; đừng học mỗi tên thuật ngữ.',
  },
  '1-ai-ml-dl-generative-ai-agentic-ai': {
    context: 'Các khái niệm này là những cấp độ/cách làm khác nhau. Chọn sai loại bài toán sẽ khiến giải pháp phức tạp và tốn kém hơn cần thiết.',
    explanation: 'Discriminative dự đoán nhãn; Generative tạo nội dung; Agent kết hợp mô hình với trạng thái, công cụ và vòng lặp hành động để hoàn thành mục tiêu.',
    example: 'Gắn nhãn email thành “hoàn tiền / giao hàng / khác” là classification; viết email trả lời là generative; tra cứu đơn rồi tạo yêu cầu hoàn tiền cần agent/workflow.',
    remember: 'Một lời gọi API hay một chatbot chưa tự động là agent; agent cần hành động có mục tiêu và quan sát kết quả.',
  },
  '2-llm-transformer-token-va-sampling': {
    context: 'Phần này giải thích cách văn bản đi qua LLM và vì sao cùng một prompt vẫn có thể tạo câu trả lời khác nhau.',
    explanation: 'Văn bản được tách thành token, chuyển thành vector, xử lý qua attention/MLP rồi decoder chọn token tiếp theo. Sampling điều chỉnh cách chọn token; context window giới hạn thông tin model đang nhìn thấy.',
    example: 'Với top-p = 0.8 và xác suất A=.45, B=.30, C=.15, D=.10, model giữ A+B+C vì A+B mới đạt .75, cần thêm C để vượt .8.',
    remember: 'Temperature/top-p thay đổi độ đa dạng, không làm model biết thêm sự thật. Context window là bộ nhớ của một lượt xử lý, không phải trí nhớ lâu dài.',
  },
  '3-prompt-engineering-va-tool-calling': {
    context: 'Prompt là hợp đồng hướng dẫn model: thiếu bối cảnh, giới hạn hoặc định dạng đầu ra thì kết quả khó ổn định và khó tích hợp.',
    explanation: 'Nêu vai trò, nhiệm vụ, dữ liệu được phép dùng, tiêu chí hoàn thành, giới hạn và output contract. Tool calling cần schema mô tả rõ tên công cụ và tham số.',
    example: 'Thay “viết email xin lỗi” bằng “xin lỗi khách vì giao trễ 2 ngày, giọng lịch sự, dưới 120 từ, xác nhận bước xử lý tiếp theo”.',
    remember: 'Prompt tốt làm rõ việc cần làm và cách biết đã làm đúng; tăng temperature không sửa được schema thiếu hoặc yêu cầu mơ hồ.',
  },
  '4-agent-react-workflow-vs-multi-agent': {
    context: 'Khi một yêu cầu cần tra cứu, ra quyết định và thực hiện hành động, cần chọn giữa luồng cố định và agent linh hoạt.',
    explanation: 'ReAct lặp Thought → Action → Observation. Workflow phù hợp khi bước đi biết trước; multi-agent phù hợp khi có các phần việc độc lập hoặc vai trò chuyên biệt đáng để tách.',
    example: 'Hỏi trạng thái đơn: agent gọi get_order_status, đọc kết quả rồi trả lời. Phân tích 100 phản hồi khách hàng có thể chia worker theo nhóm và giao supervisor tổng hợp.',
    remember: 'Chỉ thêm agent khi lợi ích điều phối vượt chi phí, độ trễ và độ phức tạp.',
  },
  '5-rag-pipeline-va-retrieval': {
    context: 'RAG giúp câu trả lời dựa vào tài liệu doanh nghiệp mà không phải huấn luyện lại model mỗi khi tài liệu đổi.',
    explanation: 'Indexing làm sạch, chia đoạn, gắn metadata và tạo vector. Lúc hỏi, hệ thống tìm đoạn phù hợp, đưa vào context rồi yêu cầu model trả lời có căn cứ.',
    example: 'Chính sách SLA 2026 thay SLA 2024: lưu effective_date/version trong metadata, chỉ truy xuất bản đang hiệu lực và gỡ bản cũ khỏi index.',
    remember: 'Tìm đúng đoạn chưa đủ: phải kiểm tra quyền truy cập, phiên bản, độ bao phủ và trích dẫn.',
  },
  '6-rag-evaluation-anh-gia-khau-nao-loi': {
    context: 'Một câu trả lời RAG sai có thể do không tìm được tài liệu, tìm đúng nhưng sinh sai, nguồn đã cũ hoặc bộ đánh giá đặt sai chuẩn.',
    explanation: 'Đo retrieval riêng với generation. Faithfulness hỏi câu trả lời có được context hỗ trợ không; Context Recall hỏi context có chứa đủ dữ kiện cần trả lời không.',
    example: 'Faithfulness .95 nhưng Context Recall .60: model bám sát đoạn đã tìm thấy, nhưng nhiều điều khoản cần thiết bị bỏ sót. Hãy sửa chunking, metadata, query/retrieval hoặc reranking.',
    remember: 'Chẩn đoán khâu lỗi trước khi đổi model.',
  },
  '7-classification-metrics-va-golden-dataset': {
    context: 'Đánh giá classifier cần gắn với hậu quả của dự đoán sai; một điểm accuracy cao có thể che việc bỏ sót lớp hiếm.',
    explanation: 'Precision giảm false positive; Recall giảm false negative; F1 cân bằng hai phía. Golden dataset là bộ ca đại diện có đáp án chuẩn để so sánh các lần thay đổi.',
    example: 'Với phát hiện giao dịch gian lận, bỏ sót giao dịch xấu rất đắt nên ưu tiên Recall; mỗi cảnh báo vẫn cần kiểm tra Precision để tránh chặn nhầm khách tốt.',
    remember: 'Chọn metric theo chi phí của lỗi, rồi giữ tập test độc lập để tránh “học thuộc” bộ đánh giá.',
  },
  '8-ai-product-scoping-pm-ux-mvp': {
    context: 'Trước khi làm AI, cần xác nhận người dùng đang vướng việc gì và AI có giải quyết tốt hơn quy tắc/phần mềm thường hay không.',
    explanation: 'Xác định actor, công việc, điểm nghẽn, bằng chứng, baseline, dữ liệu, rủi ro và tiêu chí thành công; thử nghiệm giả định rủi ro nhất bằng prototype nhỏ.',
    example: 'Tính lương theo công thức cố định nên dùng phần mềm quy tắc. Phân tích hàng chục nghìn phản hồi tự do mỗi ngày có thể phù hợp AI; đo thời gian phân loại hiện tại trước pilot.',
    remember: 'Bắt đầu từ nỗi đau có bằng chứng, không bắt đầu từ câu “mình muốn dùng AI”.',
  },
  '9-product-metrics-nsm-activation-retention': {
    context: 'Số lượt mở app hay thời gian dùng không chứng minh người dùng nhận được giá trị. Metric cần bám vào công việc họ muốn hoàn thành.',
    explanation: 'Định nghĩa activation, retention và North Star Metric với sự kiện, cohort và cửa sổ thời gian rõ ràng; theo dõi thêm guardrail để tránh tối ưu sai.',
    example: 'Với AI tư vấn trang phục, đo số lần người dùng lưu hoặc mặc gợi ý phù hợp và quay lại tuần sau; không chỉ đếm số prompt gửi cho chatbot.',
    remember: 'Đếm giá trị nhận được, không chỉ đếm hoạt động.',
  },
  '10-cost-roi-pricing-gtm': {
    context: 'AI có thể tạo giá trị nhưng chi phí token, công cụ, hạ tầng và vận hành tăng theo mức sử dụng. Cần nhìn kinh tế trên mỗi tác vụ.',
    explanation: 'Tính benefit và tổng cost trên cùng khoảng thời gian. Tách tiết kiệm tiền mặt khỏi phần năng lực lao động được giải phóng; chọn giá bán phù hợp với usage và margin.',
    example: '100 giờ tiết kiệm × 200.000đ/giờ = 20 triệu đồng năng lực. Nếu vẫn trả nguyên lương, đó chưa chắc là 20 triệu tiền mặt tiết kiệm được.',
    remember: 'ROI = (Benefit − Cost) / Cost; ghi rõ cửa sổ thời gian và loại benefit.',
  },
  '11-production-data-monitoring-ai-safety': {
    context: 'Sau khi deploy, dữ liệu và hành vi người dùng thay đổi; agent còn có thể gọi công cụ hoặc làm lộ dữ liệu, nên cần quan sát và giới hạn quyền.',
    explanation: 'Theo dõi freshness, lỗi, latency P95/P99, chi phí và chất lượng. Kiểm tra input/output, giới hạn quyền tool, yêu cầu người duyệt với hành động rủi ro và có rollback.',
    example: 'Agent trả SLA 8 giờ từ tài liệu cũ: lọc theo version/effective_date ở retrieval, buộc trích dẫn nguồn hiện hành, và chuyển người thật khi hai nguồn mâu thuẫn.',
    remember: 'An toàn là cả pipeline dữ liệu, quyền thực thi, giám sát và cách xử lý khi hệ thống không chắc chắn.',
  },
  '12-12-bay-trac-nghiem-pho-bien': {
    context: 'Các bẫy thường đánh tráo một điều đúng một phần thành khẳng định tuyệt đối, hoặc nhầm các metric/khái niệm cùng tên.',
    explanation: 'Đọc kỹ phạm vi và điều kiện: “cao” không đồng nghĩa “đủ”, similarity không chứng minh freshness, và agent không phải lúc nào cũng tốt hơn workflow.',
    example: 'Faithfulness cao nghĩa là câu trả lời dựa trên context đã lấy; nếu context thiếu nửa điều khoản thì câu trả lời vẫn chưa đầy đủ.',
    remember: 'Tìm điều kiện ẩn và hậu quả của lựa chọn sai trước khi chọn đáp án.',
  },
  '13-cong-thuc-on-nhanh': {
    context: 'Công thức chỉ có ý nghĩa khi xác định đúng đơn vị, mẫu số và lỗi cần giảm; đừng học thuộc ký hiệu tách rời bài toán.',
    explanation: 'Precision = TP/(TP+FP); Recall = TP/(TP+FN); F1 là trung bình điều hòa. ROI so lợi ích ròng với chi phí trên cùng kỳ.',
    example: 'TP=80, FP=20, FN=40 → Precision=80%, Recall≈66,7%, F1≈72,7%. Nếu bỏ sót rất đắt, nhìn Recall trước Accuracy.',
    remember: 'Đọc tử số và mẫu số thành câu để biết metric đang tính điều gì.',
  },
};

export const childExamples: Record<string, string> = {
  'pipeline-khai-quat': 'Một câu hỏi đi từ chữ → token IDs → vector → các lớp Transformer → phân phối token tiếp theo → câu trả lời.',
  'attention': 'Trong câu “Lan đưa sách cho Mai vì cô ấy cần đọc”, attention giúp mỗi token cân nhắc những từ liên quan trong context.',
  'context-window': 'Một lượt hỏi có thể gồm câu hỏi, lịch sử chat, tài liệu RAG và phần trả lời; tổng token vượt giới hạn thì phải chọn/nén bớt context.',
  'temperature': 'Cùng câu hỏi viết email: temperature thấp thường giữ cách diễn đạt ổn định; cao có thể đa dạng hơn nhưng không đảm bảo đúng hơn.',
  'top-k-k': 'Nếu top-k=2, mỗi bước chỉ sample giữa hai token có xác suất cao nhất; các token ít khả năng bị loại.',
  'top-p-p': 'Với xác suất A=.45, B=.30, C=.15, D=.10 và top-p=.8, tập giữ lại là A+B+C vì tổng A+B mới đạt .75.',
  'max-output-tokens': 'Đặt max output 100 token để giới hạn câu trả lời ngắn; nếu cần thêm nội dung, model có thể bị dừng giữa câu.',
  'greedy-decoding': 'Ở mỗi bước greedy chọn token xác suất cao nhất; lựa chọn cục bộ có thể tạo câu lặp dù mỗi bước có vẻ hợp lý.',
};
