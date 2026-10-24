import type {
  DomainTrack,
  InterviewEvaluateRequestDTO,
  InterviewEvaluateResultDTO,
  InterviewPrepRequestDTO,
  InterviewPrepResultDTO,
  MockInterviewQuestionDTO,
  StarGuidelines,
  StarRubricScoreDTO
} from './types.ts';

export function detectDomainTrack(text: string): DomainTrack {
  const normalized = (text || '').toLowerCase();

  if (
    normalized.includes('devops') ||
    normalized.includes('sre') ||
    normalized.includes('cloud') ||
    normalized.includes('kubernetes') ||
    normalized.includes('docker') ||
    normalized.includes('aws') ||
    normalized.includes('ci/cd')
  ) {
    return 'devops';
  }

  if (
    normalized.includes('mobile') ||
    normalized.includes('flutter') ||
    normalized.includes('react native') ||
    normalized.includes('ios') ||
    normalized.includes('android') ||
    normalized.includes('swift') ||
    normalized.includes('kotlin')
  ) {
    return 'mobile';
  }

  if (
    normalized.includes('fullstack') ||
    normalized.includes('full-stack') ||
    (normalized.includes('react') && normalized.includes('node'))
  ) {
    return 'fullstack';
  }

  if (
    normalized.includes('react') ||
    normalized.includes('vue') ||
    normalized.includes('angular') ||
    normalized.includes('frontend') ||
    normalized.includes('front-end') ||
    normalized.includes('ui/ux') ||
    normalized.includes('next.js') ||
    normalized.includes('tailwind')
  ) {
    return 'frontend';
  }

  if (
    normalized.includes('backend') ||
    normalized.includes('back-end') ||
    normalized.includes('node') ||
    normalized.includes('express') ||
    normalized.includes('nest') ||
    normalized.includes('golang') ||
    normalized.includes('python') ||
    normalized.includes('java') ||
    normalized.includes('spring') ||
    normalized.includes('database') ||
    normalized.includes('postgresql')
  ) {
    return 'backend';
  }

  return 'general';
}

export function detectRoleLevel(text: string): 'Junior' | 'Mid-level' | 'Senior' | 'Lead' {
  const lower = (text || '').toLowerCase();
  if (lower.includes('lead') || lower.includes('architect') || lower.includes('principal') || lower.includes('trưởng nhóm')) {
    return 'Lead';
  }
  if (lower.includes('senior') || lower.includes('chuyên viên cao cấp') || lower.includes('sr.') || lower.includes('sr ')) {
    return 'Senior';
  }
  if (lower.includes('junior') || lower.includes('intern') || lower.includes('thực tập') || lower.includes('fresher')) {
    return 'Junior';
  }
  return 'Mid-level';
}

const DOMAIN_QUESTION_BANK: Record<DomainTrack, MockInterviewQuestionDTO[]> = {
  frontend: [
    {
      id: 'fe-tech-1',
      question: 'Bạn làm thế nào để chẩn đoán và khắc phục vấn đề re-render không cần thiết trong ứng dụng React quy mô lớn?',
      category: 'technical',
      intent: 'Đánh giá hiểu biết sâu về vòng đời React Fiber, memoization, cơ chế so sánh props và kỹ thuật profiling hiệu năng.',
      domainTrack: 'frontend',
      starGuidelines: {
        situation: 'Nêu bối cảnh một trang tính năng hoặc dashboard phức tạp bị giảm FPS khi người dùng tương tác.',
        task: 'Xác định thành phần render dư thừa và mục tiêu đạt 60fps mượt mà.',
        action: 'Sử dụng React DevTools Profiler, chuyển đổi sang useMemo/useCallback đúng cách hoặc tách rời state cục bộ.',
        result: 'Thời gian render giảm từ 120ms xuống dưới 16ms, giao diện phản hồi tức thì.'
      },
      sampleAnswer: 'Trong một dashboard phân tích dữ liệu, việc cập nhật bộ lọc thường xuyên khiến toàn bộ cây 40 biểu đồ bị render lại. Tôi đã bật React DevTools Profiler và phát hiện các inline object callback truyền qua props là nguyên nhân chính. Tôi đã chuẩn hóa state management, sử dụng React.memo cho các chart components và đưa handlers ra useCallback. Kết quả thời gian re-render giảm 85% và người dùng không còn gặp hiện tượng giật lag.'
    },
    {
      id: 'fe-tech-2',
      question: 'Hãy giải thích chiến lược tối ưu hóa Core Web Vitals (LCP, INP, CLS) mà bạn đã từng áp dụng vào dự án thực tế?',
      category: 'technical',
      intent: 'Kiểm tra năng lực tối ưu trải nghiệm người dùng thực tế và các chỉ số đo lường chuẩn Google.',
      domainTrack: 'frontend',
      starGuidelines: {
        situation: 'Mô tả trang web landing hoặc trang sản phẩm có điểm số PageSpeed thấp và trải nghiệm gián đoạn.',
        task: 'Nâng điểm hiệu năng di động từ mức báo động (đỏ) lên mức tốt (xanh).',
        action: 'Tối ưu ảnh (WebP/AVIF, kích thước cố định để chống CLS), phân tách bundle (code splitting) và ưu tiên tài nguyên quan trọng (preload LCP).',
        result: 'Chỉ số LCP giảm từ 4.2s xuống 1.5s, CLS về 0.02, tỷ lệ thoát trang giảm 22%.'
      },
      sampleAnswer: 'Khi trang web thương mại điện tử gặp điểm số Web Vitals thấp trên mobile, tôi đã phân tích waterfall network và phát hiện hero banner dung lượng 2.4MB làm tắc nghẽn LCP. Tôi đã chuyển ảnh sang định dạng WebP với thẻ picture responsive, bổ sung thuộc tính fetchpriority="high", đồng thời đặt kích thước width/height cố định cho mọi container ảnh. Nhờ đó, LCP giảm xuống 1.4s và điểm PageSpeed tăng từ 48 lên 94 điểm.'
    },
    {
      id: 'fe-behav-1',
      question: 'Kể về một lần bạn và Product Designer hoặc UI/UX Lead có sự bất đồng về tính khả thi của một thiết kế giao diện phức tạp?',
      category: 'behavioral',
      intent: 'Đánh giá kỹ năng giao tiếp, sự tôn trọng trải nghiệm người dùng và tư duy tìm kiếm giải pháp dung hòa kỹ thuật.',
      domainTrack: 'frontend',
      starGuidelines: {
        situation: 'Designer muốn một hiệu ứng animation kéo thả đa chiều rất phức tạp trước hạn chót phát hành 3 ngày.',
        task: 'Đảm bảo giao diện trực quan và deadline release đúng hẹn mà không tạo rủi ro hiệu năng.',
        action: 'Chủ động họp 1-1, dựng nhanh 2 bản prototype (bản đầy đủ và bản tinh giản mượt mà), thảo luận trên dữ liệu FPS thực tế.',
        result: 'Designer đồng thuận với phương án tinh giản, tính năng hoàn thành đúng hạn 100% không lỗi phát sinh.'
      },
      sampleAnswer: 'Trong đợt ra mắt bảng Kanban mới, Designer đề xuất hiệu ứng animation morphing phức tạp khi kéo thẻ. Khi chạy thử nghiệm, thiết bị tầm trung bị tụt FPS xuống còn 24. Tôi đã chủ động mời Designer xem trực tiếp bài kiểm tra hiệu năng và đề xuất một hiệu ứng CSS transform gọn nhẹ hơn nhưng giữ nguyên 90% cảm giác thẩm mỹ. Bạn ấy hoàn toàn bị thuyết phục và team đã release đúng ngày với đánh giá rất tích cực từ người dùng.'
    },
    {
      id: 'fe-sit-1',
      question: 'Nếu người dùng phản ánh trang bảng dữ liệu chứa 15.000 dòng bị đơ cứng khi cuộn trên trình duyệt di động, bạn sẽ xử lý như thế nào?',
      category: 'situational',
      intent: 'Khảo sát giải pháp xử lý dữ liệu lớn trên client: Virtual DOM, Windowing/Virtualization và Web Workers.',
      domainTrack: 'frontend',
      starGuidelines: {
        situation: 'DOM chứa quá nhiều nút (DOM tree quá tải) gây tràn bộ nhớ trình duyệt.',
        task: 'Tải và cuộn mượt mà 15.000 dòng mà không tiêu tốn RAM trình duyệt.',
        action: 'Áp dụng kỹ thuật Virtualized Windowing (chỉ render ~25 dòng hiển thị trên màn hình) kết hợp pagination/infinite scroll.',
        result: 'DOM chỉ duy trì dưới 40 phần tử, dung lượng bộ nhớ giảm 90%, thao tác cuộn đạt 60fps mượt mà.'
      },
      sampleAnswer: 'Vấn đề cốt lõi là trình duyệt phải duy trì hàng chục nghìn DOM nodes gây tắc nghẽn layout engine. Tôi sẽ thay thế bảng truyền thống bằng thư viện Virtualization như TanStack Virtual hoặc tự viết cơ chế windowing dựa trên window.requestAnimationFrame và container scroll offset. Khi đó dù danh sách có 100.000 phần tử, DOM chỉ render đúng các dòng trong tầm nhìn (viewport). Ngoài ra, các tác vụ tính toán lọc hay sắp xếp sẽ được chuyển vào Web Worker.'
    }
  ],
  backend: [
    {
      id: 'be-tech-1',
      question: 'Bạn xử lý thế nào để đảm bảo tính Idempotency và ngăn chặn Race Condition khi hệ thống nhận 2 yêu cầu giao dịch tài chính hoặc trừ tiền cùng một mili-giây?',
      category: 'technical',
      intent: 'Đánh giá kiến thức về Database Transaction, Pessimistic/Optimistic Locking, Idempotency-Key và tính toàn vẹn dữ liệu.',
      domainTrack: 'backend',
      starGuidelines: {
        situation: 'Hệ thống thanh toán hoặc cộng/trừ số dư ví đối mặt với nguy cơ người dùng click đúp hoặc network retry.',
        task: 'Đảm bảo mỗi giao dịch chỉ được trừ tiền đúng 1 lần duy nhất (Exactly-Once processing semantics).',
        action: 'Triển khai bảng khóa Idempotency-Key ở tầng API gateway và sử dụng SELECT ... FOR UPDATE hoặc số dư có điều kiện (WHERE balance >= amount) trong Database transaction.',
        result: 'Loại bỏ hoàn toàn rủi ro trừ tiền hai lần, tỷ lệ xung đột được giải quyết an toàn không rò rỉ dữ liệu.'
      },
      sampleAnswer: 'Tôi áp dụng mô hình bảo vệ hai lớp: Ở tầng ứng dụng, mọi request chuyển tiền bắt buộc phải kèm header Idempotency-Key được lưu nguyên tử bằng Redis/DB với TTL. Ở tầng cơ sở dữ liệu, câu lệnh cập nhật số dư luôn chạy trong Transaction cô lập với câu lệnh UPDATE accounts SET balance = balance - :amount WHERE id = :id AND balance >= :amount RETURNING balance. Cơ chế này khóa hàng dữ liệu tại chỗ và đảm bảo nếu số dư không đủ hoặc request bị lặp, thao tác sẽ được bảo vệ tuyệt đối.'
    },
    {
      id: 'be-tech-2',
      question: 'Hãy mô tả chiến lược thiết kế cơ sở dữ liệu PostgreSQL cho bài toán ghi log hoặc lưu trữ hàng triệu bản ghi mỗi ngày mà truy vấn vẫn nhanh?',
      category: 'technical',
      intent: 'Kiểm tra kỹ năng phân vùng (Table Partitioning), BRIN Index, Connection Pooling và thiết lập chu kỳ lưu trữ (Retention Policy).',
      domainTrack: 'backend',
      starGuidelines: {
        situation: 'Bảng dữ liệu tăng trưởng 5 triệu bản ghi/ngày khiến chỉ mục B-Tree phình to và truy vấn ngày tháng bị chậm.',
        task: 'Duy trì tốc độ tìm kiếm dưới 100ms và tự động dọn dẹp dữ liệu cũ quá 90 ngày.',
        action: 'Áp dụng Table Partitioning theo tháng/ngày, sử dụng BRIN index cho cột thời gian và thiết lập pg_partman hoặc cron drop partition cũ.',
        result: 'Tốc độ truy vấn tăng gấp 8 lần, thao tác xóa dữ liệu cũ trở thành DROP TABLE tức thì không tốn I/O VACUUM.'
      },
      sampleAnswer: 'Với lượng dữ liệu chuỗi thời gian lớn, B-Tree index thông thường sẽ vượt quá kích thước RAM buffer pool. Tôi đã chia bảng chính thành các Declarative Range Partitions theo tháng. Trên cột created_at, tôi sử dụng BRIN Index chỉ chiếm vài chục kilobyte thay vì hàng gigabyte của B-Tree. Khi cần xóa dữ liệu cũ quá hạn, hệ thống chỉ cần lệnh DROP TABLE partition con thay vì DELETE diện rộng, tránh được hoàn toàn chi phí ghi log WAL và phình bảng (table bloat).'
    },
    {
      id: 'be-behav-1',
      question: 'Kể về một sự cố nghiêm trọng trên môi trường Production (Outage / High Latency) mà bạn trực tiếp tham gia khắc phục dưới áp lực thời gian?',
      category: 'behavioral',
      intent: 'Đánh giá bản lĩnh xử lý khủng hoảng, kỹ năng đọc log/telemetry và quy trình Post-Mortem chuyên nghiệp.',
      domainTrack: 'backend',
      starGuidelines: {
        situation: 'Hệ thống backend bị treo vào giờ cao điểm, CPU chạm 100% và database connection pool cạn kiệt.',
        task: 'Khôi phục dịch vụ cho người dùng trong vòng dưới 15 phút và bảo toàn tính toàn vẹn dữ liệu.',
        action: 'Kiểm tra ngay active queries qua pg_stat_activity, phát hiện truy vấn thiếu index bị lock, kill truy vấn nghẽn, mở rộng tạm thời pool và rollout patch index khẩn cấp.',
        result: 'Dịch vụ phục hồi sau 11 phút, sau đó tổ chức buổi họp Post-Mortem và bổ sung circuit breaker ngăn chặn tái diễn.'
      },
      sampleAnswer: 'Vào đợt cao điểm khuyến mãi, API đột ngột trả về 504 Gateway Timeout. Tôi lập tức truy cập Grafana và PostgreSQL server, phát hiện toàn bộ 50 kết nối DB đang bị kẹt bởi một truy vấn thống kê lớn không có index. Tôi đã dùng hàm pg_terminate_backend để hủy truy vấn đó, giải phóng kết nối cho luồng mua hàng trong 3 phút. Sau khi dịch vụ ổn định, tôi đã thêm partial index cần thiết và chuyển toàn bộ truy vấn báo cáo sang Read Replica độc lập.'
    },
    {
      id: 'be-sit-1',
      question: 'Nếu hệ thống gửi email hoặc thông báo tuyển dụng của bạn bị nhà cung cấp bên thứ ba giới hạn tốc độ (Rate Limit 429), bạn sẽ thiết kế giải pháp như thế nào?',
      category: 'situational',
      intent: 'Đánh giá tư duy thiết kế hệ thống bất đồng bộ: Message Queue, Exponential Backoff, Dead Letter Queue và Leaky Bucket.',
      domainTrack: 'backend',
      starGuidelines: {
        situation: 'Hệ thống gửi thư mời phỏng vấn hàng loạt bị nhà cung cấp email chặn vì vượt quá 10 req/s.',
        task: 'Đảm bảo 100% email đến tay ứng viên mà không bị mất mát hay bị từ chối 429.',
        action: 'Chuyển đổi luồng gửi trực tiếp sang hàng đợi Message Queue (RabbitMQ / Redis BullMQ), cấu hình worker tiêu thụ theo thuật toán Token Bucket và cơ chế retry có Exponential Backoff.',
        result: 'Toàn bộ thư gửi đi thành công với độ trễ thấp và không có request nào bị lỗi quá tải.'
      },
      sampleAnswer: 'Tôi sẽ tách rời hoàn toàn tác vụ gửi email khỏi chu trình HTTP request chính bằng cách sử dụng hàng đợi bất đồng bộ. Mỗi email cần gửi được đẩy vào Queue dưới dạng Job. Các background workers sẽ lấy công việc ra xử lý có giới hạn tần suất (Rate Limiter 8 req/s) theo thuật toán Token Bucket. Nếu gặp lỗi mạng tạm thời, worker sẽ thử lại với khoảng chờ tăng dần theo cấp số nhân (Exponential Backoff kèm Jitter) tối đa 5 lần trước khi chuyển vào Dead Letter Queue để theo dõi.'
    }
  ],
  fullstack: [
    {
      id: 'fs-tech-1',
      question: 'Khi xây dựng một tính năng cần đồng bộ trạng thái thời gian thực giữa Web và Server (ví dụ bảng Kanban chuyển trạng thái ứng tuyển), bạn chọn Server-Sent Events (SSE) hay WebSockets? Vì sao?',
      category: 'technical',
      intent: 'Đánh giá khả năng cân nhắc kiến trúc mạng, chi phí tài nguyên server, hạ tầng proxy và tính đơn giản trong vận hành.',
      domainTrack: 'fullstack',
      starGuidelines: {
        situation: 'Ứng dụng cần cập nhật trạng thái hồ sơ tức thì khi có hoạt động mới từ extension hoặc đồng nghiệp.',
        task: 'Lựa chọn giao thức phù hợp với tính chất giao tiếp đơn hướng từ máy chủ xuống máy trạm.',
        action: 'Chọn SSE với HTTP/2, cơ chế tự động kết nối lại (auto-reconnect) và Last-Event-ID recovery thay vì duy trì socket hai chiều phức tạp.',
        result: 'Tiết kiệm tài nguyên máy chủ, chạy mượt mà qua mọi tường lửa/proxy HTTP thông thường và dễ dàng gỡ lỗi.'
      },
      sampleAnswer: 'Đối với nhu cầu thông báo trạng thái từ server về client, tôi ưu tiên Server-Sent Events (SSE) vì bản chất luồng dữ liệu là một chiều (Server to Client). SSE hoạt động trên giao thức HTTP tiêu chuẩn, tận dụng được HTTP/2 multiplexing, vượt qua proxy/firewall doanh nghiệp dễ dàng và tích hợp sẵn cơ chế reconnect cùng Last-Event-ID. WebSockets chỉ thực sự cần thiết khi ứng dụng đòi hỏi tương tác hai chiều liên tục với độ trễ tính bằng mili-giây như bảng vẽ tương tác hoặc chat p2p.'
    },
    {
      id: 'fs-behav-1',
      question: 'Kể về một quyết định kỹ thuật (Architectural Trade-off) mà bạn phải đánh đổi giữa việc giao hàng nhanh (Time-to-market) và chất lượng kiến trúc hoàn hảo?',
      category: 'behavioral',
      intent: 'Đánh giá tư duy kinh doanh của kỹ sư, khả năng quản trị nợ kỹ thuật (Tech Debt) và tinh thần trách nhiệm.',
      domainTrack: 'fullstack',
      starGuidelines: {
        situation: 'Dự án cần ra mắt tính năng trích xuất CV trong 1 tuần để kịp sự kiện ngày hội việc làm.',
        task: 'Đáp ứng đúng deadline cam kết mà không để lại lỗ hổng bảo mật hay mã nguồn không thể bảo trì.',
        action: 'Chọn giải pháp rule-based extraction kết hợp schema validation nghiêm ngặt thay vì huấn luyện mô hình ML tùy biến dài ngày; ghi nhận rõ nợ kỹ thuật vào backlog.',
        result: 'Tính năng ra mắt thành công thu hút 1.200 lượt sử dụng trong ngày hội, sau đó team quay lại refactor theo đúng kế hoạch.'
      },
      sampleAnswer: 'Khi cần ra mắt tính năng nhập tin tuyển dụng tự động trong vòng 5 ngày cho ngày hội tuyển dụng, phương án lý tưởng là xây dựng đường ống AI pipeline đầy đủ. Tuy nhiên, nhận thấy rủi ro chậm trễ, tôi đã đề xuất phương án trích xuất dựa trên JSON-LD Schema.org kết hợp DOM Readability Parser. Giải pháp này đáp ứng 92% độ chính xác cho các trang tuyển dụng phổ biến và hoàn thành trước deadline 1 ngày. Sau sự kiện, tôi đã bổ sung layer AI fallback để xử lý 8% các trang có cấu trúc đặc biệt.'
    }
  ],
  devops: [
    {
      id: 'do-tech-1',
      question: 'Bạn thiết kế đường ống CI/CD (GitHub Actions / GitLab CI) như thế nào để đảm bảo thời gian build dưới 5 phút mà vẫn chạy đủ Lint, Typecheck, Unit Test và Container Security Scan?',
      category: 'technical',
      intent: 'Kiểm tra kỹ năng tối ưu hóa pipeline: Caching dependencies, ma trận song song (Matrix parallel), Docker multi-stage build và vulnerability scanning.',
      domainTrack: 'devops',
      starGuidelines: {
        situation: 'Pipeline CI chạy mất 18 phút gây ùn tắc quy trình merge code của toàn team.',
        task: 'Rút ngắn thời gian feedback cho lập trình viên xuống dưới 5 phút.',
        action: 'Tận dụng cache lockfile npm, chia nhỏ luồng test thành các jobs chạy song song, sử dụng Docker BuildKit cache mounts.',
        result: 'Thời gian hoàn tất pipeline giảm xuống 3 phút 45 giây, năng suất release của team tăng gấp 3 lần.'
      },
      sampleAnswer: 'Tôi bắt đầu bằng việc phân tích biểu đồ Gantt của CI run. Hai nguyên nhân gây chậm nhất là tải lại node_modules và build image tuần tự. Tôi đã cấu hình actions/cache dựa trên khóa băm hash của package-lock.json, phân tách khâu kiểm tra thành 3 jobs song song (Typecheck, Linting, Unit Tests). Với Dockerfile, tôi áp dụng Multi-stage build và tận dụng GitHub Actions Cache backend của Docker BuildKit. Kết quả tổng thời gian chạy giảm từ 18 phút xuống 3 phút 40 giây.'
    }
  ],
  mobile: [
    {
      id: 'mob-tech-1',
      question: 'Làm thế nào để bạn xử lý lưu trữ dữ liệu ngoại tuyến (Offline-First) và đồng bộ mượt mà khi thiết bị người dùng có kết nối mạng trở lại?',
      category: 'technical',
      intent: 'Đánh giá kiến trúc SQLite/WatermelonDB, Conflict Resolution và cơ chế đồng bộ nền (Background Sync).',
      domainTrack: 'mobile',
      starGuidelines: {
        situation: 'Ứng viên di chuyển trên tàu xe có kết nối chập chờn nhưng vẫn cần cập nhật ghi chú phỏng vấn.',
        task: 'Mọi thao tác lưu lại tức thì trên máy cục bộ và tự động đồng bộ khi có Internet.',
        action: 'Sử dụng local database với cơ chế outbox queue; khi mạng kết nối lại thì đẩy các mutations theo thứ tự kèm timestamp.',
        result: 'Ứng dụng không bao giờ bị đứng hình chờ mạng, dữ liệu đồng bộ chính xác không bị trùng lặp.'
      },
      sampleAnswer: 'Tôi áp dụng mô hình Offline-First với SQLite cục bộ làm Single Source of Truth. Mọi thay đổi của người dùng được ghi nhận ngay vào cơ sở dữ liệu nội bộ và một hàng đợi Outbox. Một Background Sync service lắng nghe sự kiện NetInfo; khi thiết bị trực tuyến trở lại, service sẽ đẩy tuần tự các thao tác trong outbox lên server kèm theo idempotency token. Trường hợp có xung đột dữ liệu từ thiết bị khác, server sẽ áp dụng chiến lược Last-Write-Wins hoặc dựa trên version hash.'
    }
  ],
  general: [
    {
      id: 'gen-behav-1',
      question: 'Hãy mô tả một mục tiêu nghề nghiệp lớn nhất của bạn trong 2 năm tới và bạn đang chuẩn bị những gì để đạt được nó?',
      category: 'behavioral',
      intent: 'Khảo sát định hướng phát triển bản thân, mức độ chủ động học hỏi và sự gắn kết lâu dài với tổ chức.',
      domainTrack: 'general',
      starGuidelines: {
        situation: 'Chia sẻ ngắn gọn vị trí hiện tại và tầm nhìn phát triển.',
        task: 'Mục tiêu rõ ràng cụ thể (ví dụ trở thành Technical Lead hoặc Chuyên gia tối ưu hệ thống).',
        action: 'Kế hoạch hành động cụ thể: học chứng chỉ, đóng góp mã nguồn mở, đọc sách chuyên ngành, mentor đồng nghiệp.',
        result: 'Kết quả ban đầu đã đạt được và kỳ vọng đóng góp cho công ty mới.'
      },
      sampleAnswer: 'Trong 2 năm tới, mục tiêu của tôi là trở thành một Technical Lead vững vàng, có khả năng dẫn dắt kiến trúc cho các hệ thống phục vụ hàng triệu người dùng và đồng hành đào tạo các kỹ sư trẻ. Để chuẩn bị, bên cạnh việc liên tục thực hành thiết kế phân tán trong công việc, tôi duy trì thói quen đọc tài liệu kiến trúc kỹ thuật quốc tế và tham gia hướng dẫn 2 bạn thực tập sinh trong team cũ đạt kết quả xuất sắc.'
    }
  ]
};

const REVERSE_QUESTIONS_POOL = [
  'Quy trình CI/CD và văn hóa kiểm thử tự động của đội ngũ kỹ thuật hiện tại đang được vận hành như thế nào?',
  'Trong 3 đến 6 tháng tới, thách thức công nghệ hoặc sản phẩm lớn nhất mà team đang tập trung giải quyết là gì?',
  'Công ty định hướng như thế nào về việc cân bằng giữa áp lực ra mắt tính năng mới và việc đầu tư giải quyết nợ kỹ thuật (Tech Debt)?',
  'Văn hóa xử lý sự cố (Post-Mortem) của bộ phận kỹ thuật diễn ra như thế nào khi hệ thống gặp trục trặc trên Production?',
  'Cơ hội học tập, nghiên cứu công nghệ mới và lộ trình thăng tiến chuyên môn cho vị trí này được tổ chức ra sao?'
];

const GENERAL_TIPS_POOL = [
  'Áp dụng triệt để nguyên tắc STAR: Situation (15%) -> Task (15%) -> Action (45%) -> Result (25%).',
  'Luôn đưa ra con số định lượng cụ thể: %, mili-giây, số lượng người dùng, doanh thu hoặc thời gian tiết kiệm được.',
  'Khi trả lời câu hỏi tình huống, hãy tập trung vào từ "TÔI" (hành động trực tiếp của bạn) thay vì chỉ nói chung chung "CHÚNG TÔI".',
  'Chuẩn bị sẵn 2-3 câu hỏi hỏi ngược lại nhà tuyển dụng để thể hiện sự quan tâm sâu sắc đến văn hóa và chiến lược công nghệ của công ty.'
];

export function generateInterviewQuestions(input: InterviewPrepRequestDTO): InterviewPrepResultDTO {
  const company = (input.company || '').trim() || 'Doanh nghiệp tuyển dụng';
  const position = (input.position || '').trim() || 'Kỹ sư phần mềm';
  const combinedContext = `${position} ${(input.notes || '')} ${(input.skills || []).join(' ')}`;

  const track: DomainTrack = input.domainTrack || detectDomainTrack(combinedContext);
  const roleLevel = detectRoleLevel(combinedContext);

  const primaryQuestions = DOMAIN_QUESTION_BANK[track] || DOMAIN_QUESTION_BANK.general;
  const generalQuestions = DOMAIN_QUESTION_BANK.general;

  const questions: MockInterviewQuestionDTO[] = [...primaryQuestions];

  if (track !== 'general') {
    questions.push(...generalQuestions);
  }

  return {
    company,
    position,
    domainTrack: track,
    roleLevel,
    questions: questions.slice(0, 5),
    reverseQuestions: REVERSE_QUESTIONS_POOL.slice(0, 4),
    tips: GENERAL_TIPS_POOL
  };
}

export function evaluateStarAnswer(input: InterviewEvaluateRequestDTO): InterviewEvaluateResultDTO {
  const text = (input.answer || '').trim();
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  let situationScore = 4;
  if (
    lower.includes('khi') ||
    lower.includes('dự án') ||
    lower.includes('bối cảnh') ||
    lower.includes('hệ thống') ||
    lower.includes('lúc đó') ||
    lower.includes('công ty')
  ) {
    situationScore += 3;
  }
  if (lower.includes('vấn đề') || lower.includes('thách thức') || lower.includes('nguyên nhân')) {
    situationScore += 2;
  }
  situationScore = Math.min(10, Math.max(2, situationScore));

  let taskScore = 4;
  if (
    lower.includes('nhiệm vụ') ||
    lower.includes('mục tiêu') ||
    lower.includes('vai trò') ||
    lower.includes('trách nhiệm') ||
    lower.includes('cần phải')
  ) {
    taskScore += 3;
  }
  if (lower.includes('thời hạn') || lower.includes('yêu cầu') || lower.includes('deadline')) {
    taskScore += 2;
  }
  taskScore = Math.min(10, Math.max(2, taskScore));

  let actionScore = 4;
  if (
    lower.includes('tôi đã') ||
    lower.includes('quyết định') ||
    lower.includes('áp dụng') ||
    lower.includes('triển khai') ||
    lower.includes('viết') ||
    lower.includes('tối ưu') ||
    lower.includes('refactor') ||
    lower.includes('thiết kế')
  ) {
    actionScore += 3;
  }
  if (
    lower.includes('phân tích') ||
    lower.includes('thảo luận') ||
    lower.includes('đo lường') ||
    lower.includes('nghiên cứu') ||
    lower.includes('bước 1') ||
    lower.includes('sau đó')
  ) {
    actionScore += 2;
  }
  actionScore = Math.min(10, Math.max(2, actionScore));

  let resultScore = 3;
  const hasNumbers = /\d+([.,]\d+)?\s*(%|ms|s|giây|phút|giờ|triệu|k|lần|x|user|người)/i.test(text) || /\d+/.test(text);
  if (hasNumbers) {
    resultScore += 4;
  }
  if (
    lower.includes('kết quả') ||
    lower.includes('thành công') ||
    lower.includes('tăng') ||
    lower.includes('giảm') ||
    lower.includes('tiết kiệm') ||
    lower.includes('đúng hạn')
  ) {
    resultScore += 2;
  }
  resultScore = Math.min(10, Math.max(2, resultScore));

  let clarityScore = 5;
  if (wordCount >= 40 && wordCount <= 300) {
    clarityScore += 3;
  } else if (wordCount >= 20) {
    clarityScore += 1;
  }
  if (text.includes('\n') || text.includes('. ')) {
    clarityScore += 2;
  }
  clarityScore = Math.min(10, Math.max(2, clarityScore));

  const weighted =
    situationScore * 0.15 +
    taskScore * 0.15 +
    actionScore * 0.35 +
    resultScore * 0.25 +
    clarityScore * 0.1;
  const overallScore = Math.round(weighted * 10) / 10;

  let verdict: 'Xuất sắc' | 'Đạt yêu cầu' | 'Cần cải thiện' = 'Cần cải thiện';
  if (overallScore >= 8.0) {
    verdict = 'Xuất sắc';
  } else if (overallScore >= 6.0) {
    verdict = 'Đạt yêu cầu';
  }

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (actionScore >= 7) {
    strengths.push('Mô tả hành động giải quyết cụ thể, thể hiện rõ vai trò cá nhân của bạn.');
  }
  if (hasNumbers) {
    strengths.push('Có số liệu định lượng đo lường kết quả thực tế (%, thời gian hoặc chỉ số đo được).');
  }
  if (situationScore >= 7) {
    strengths.push('Bối cảnh ban đầu được thiết lập rõ ràng, giúp người phỏng vấn nắm bắt bài toán nhanh chóng.');
  }
  if (strengths.length === 0) {
    strengths.push('Đã trả lời đúng trọng tâm câu hỏi phỏng vấn.');
  }

  if (!hasNumbers) {
    improvements.push('Cần bổ sung con số định lượng ở phần Kết quả (ví dụ: hiệu năng tăng bao nhiêu %, tiết kiệm bao nhiêu giờ làm việc).');
  }
  if (wordCount < 40) {
    improvements.push('Câu trả lời còn tương đối ngắn gọn. Nên mở rộng chi tiết các giải pháp kỹ thuật đã đưa ra.');
  }
  if (!lower.includes('tôi') && lower.includes('chúng tôi')) {
    improvements.push('Hãy nhấn mạnh vào phần đóng góp cá nhân (sử dụng "Tôi đã...") thay vì chỉ nói chung chung về tập thể.');
  }
  if (improvements.length === 0) {
    improvements.push('Tiếp tục duy trì phong thái tự tin và phát huy các điểm nhấn kiến trúc trong buổi phỏng vấn trực tiếp.');
  }

  const improvedAnswer =
    `[Tình huống]: Trong bối cảnh dự án đang phát triển, nhóm chúng tôi đối mặt với bài toán liên quan đến ${input.question.slice(0, 60)}...\n\n` +
    `[Nhiệm vụ]: Trách nhiệm của tôi là tìm ra giải pháp tối ưu và giải quyết triệt để vấn đề trong thời gian sớm nhất.\n\n` +
    `[Hành động]: ${text}\n\n` +
    `[Kết quả]: Nhờ phương án trên, hệ thống đã hoạt động ổn định, nâng cao hiệu suất xử lý lên hơn 35% và nhận được phản hồi tích cực từ toàn đội ngũ.`;

  const rubric: StarRubricScoreDTO = {
    situationScore,
    taskScore,
    actionScore,
    resultScore,
    clarityScore
  };

  return {
    overallScore,
    verdict,
    strengths,
    improvements,
    improvedAnswer,
    rubric
  };
}
