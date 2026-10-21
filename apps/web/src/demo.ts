import { emptyDraft, type Application, type Status } from './domain';
import type { DatasetWireDTO, DatasetRecordWireDTO } from '@jobtrack/contract';

const rows = [
  ['FPT Software', 'Frontend Developer', 'Interview', 'Hà Nội', 'Chuẩn bị vòng kỹ thuật', 'FPT Careers', 'FE-102'],
  ['VNG', 'React Developer', 'Applied', 'TP. Hồ Chí Minh', 'Liên hệ lại recruiter', 'VNG Careers', 'RE-201'],
  ['Shopee', 'Software Engineer', 'Screening', 'TP. Hồ Chí Minh', 'Hoàn thành bài kiểm tra', 'Shopee Careers', 'SE-32'],
  ['Tiki', 'Frontend Engineer', 'Offer', 'Hà Nội', 'Xem điều khoản offer', 'Tiki Careers', 'FE-12'],
  ['MoMo', 'UI Engineer', 'Saved', 'TP. Hồ Chí Minh', 'Đọc mô tả công việc', 'MoMo Careers', 'UI-24'],
  ['NashTech', 'React Engineer', 'Saved', 'Hà Nội', 'Điều chỉnh CV', 'NashTech', 'RE-52'],
  ['KMS', 'Frontend Developer', 'Saved', 'Đà Nẵng', '', 'KMS', 'FE-73'],
  ['One Mount', 'Web Developer', 'Saved', 'Hà Nội', '', 'One Mount', 'WE-81'],
  ['Grab', 'Software Engineer', 'Rejected', 'Remote', '', 'Grab', 'SE-91'],
  ['Zalo', 'UI Developer', 'Applied', 'TP. Hồ Chí Minh', 'Chuẩn bị portfolio', 'Zalo', 'UI-01'],
  ['GHTK', 'Frontend Engineer', 'Withdrawn', 'Hà Nội', '', 'GHTK', 'FE-85'],
  ['FPT Software', 'Junior Developer', 'Withdrawn', 'Hà Nội', '', 'FPT Careers', 'JR-31'],
];

export function fixture(): Application[] {
  const now = new Date();
  function day(offset: number, hour = 10, minute = 0) {
    const date = new Date(now); date.setDate(date.getDate() + offset); date.setHours(hour, minute, 0, 0); return date;
  }
  function local(date: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return rows.map((row, index) => ({
    ...emptyDraft, id: `demo-${index}`, company: row[0], position: row[1], status: row[2] as Status,
    location: row[3], nextAction: row[4], source: row[5], jobCode: row[6], workMode: index % 2 ? 'Hybrid' : 'On-site',
    url: `https://example.com/jobs/${row[6]}`, appliedAt: row[2] === 'Saved' ? '' : local(day(-2 - index % 6)).slice(0, 10),
    createdAt: day(-index).toISOString(), salary: index === 0 ? '20–25 triệu/tháng' : '',
    notes: index === 0 ? 'Ôn React hooks và TypeScript. Chuẩn bị một ví dụ tối ưu hiệu năng từ dự án cá nhân.' : '',
    deadline: row[4] ? local(day(index === 0 ? 0 : 2 + index % 3, 18)) : '',
    interviews: index === 0 ? [
      { id: 'round-1', title: 'Vòng kỹ thuật', at: day(1, 20).toISOString(), timezone: 'America/New_York', format: 'Online', location: 'https://meet.google.com/abc-defg-hij', preparation: 'Ôn React, TypeScript và chuẩn bị demo.', notes: '', status: 'Scheduled' },
      { id: 'round-2', title: 'Trao đổi với HR', at: day(-3).toISOString(), timezone: 'Asia/Ho_Chi_Minh', format: 'Phone', location: '', preparation: '', notes: '', status: 'Completed' },
    ] : index === 2 ? [
      { id: 'round-3', title: 'Trao đổi kỹ thuật', at: day(3, 14, 30).toISOString(), timezone: 'Asia/Ho_Chi_Minh', format: 'Online', location: '', preparation: '', notes: '', status: 'Scheduled' },
    ] : [],
  }));
}

export function demoDatasets(): DatasetWireDTO[] {
  return [
    {
      id: 'demo-ds-1',
      userId: 'demo-user',
      name: 'So sánh Laptop & Thiết bị IT',
      description: 'Dữ liệu cào tự động từ Thế Giới Di Động, FPT Shop, CellphoneS bằng PageWeave Clipper',
      category: 'product_research',
      schemaVersion: 1,
      columns: [
        { key: 'name', label: 'Tên sản phẩm', type: 'text', required: true },
        { key: 'price', label: 'Giá niêm yết', type: 'currency' },
        { key: 'specs', label: 'Cấu hình tóm tắt', type: 'text' },
        { key: 'vendor', label: 'Nhà cung cấp', type: 'text' }
      ],
      recordCount: 3,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'demo-ds-2',
      userId: 'demo-user',
      name: 'Danh sách Top Công ty Công nghệ & Fintech VN',
      description: 'Thu thập thông tin doanh nghiệp, website, email tuyển dụng cho chiến dịch tiếp cận đối tác',
      category: 'company_list',
      schemaVersion: 1,
      columns: [
        { key: 'company', label: 'Tên công ty', type: 'text', required: true },
        { key: 'industry', label: 'Ngành nghề', type: 'text' },
        { key: 'website', label: 'Website', type: 'url' },
        { key: 'email', label: 'Email liên hệ', type: 'text' }
      ],
      recordCount: 3,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 'demo-ds-3',
      userId: 'demo-user',
      name: 'Ghi chú Nghiên cứu: Xu hướng AI Agent 2026',
      description: 'Trích xuất bài báo khoa học, báo cáo thị trường và trích dẫn kèm provenance link',
      category: 'research_notes',
      schemaVersion: 1,
      columns: [
        { key: 'title', label: 'Tiêu đề bài viết', type: 'text', required: true },
        { key: 'author', label: 'Tác giả / Nguồn', type: 'text' },
        { key: 'summary', label: 'Tóm tắt trích dẫn', type: 'text' },
        { key: 'date', label: 'Ngày xuất bản', type: 'date' }
      ],
      recordCount: 2,
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      updatedAt: new Date(Date.now() - 14400000).toISOString()
    }
  ];
}

export function demoDatasetRecords(datasetId: string): DatasetRecordWireDTO[] {
  if (datasetId === 'demo-ds-1') {
    return [
      {
        id: 'rec-1',
        datasetId: 'demo-ds-1',
        userId: 'demo-user',
        sourceUrl: 'https://thegioididong.com/laptop/macbook-pro-m3',
        sourceTitle: 'MacBook Pro 14 M3 16GB 512GB - TGDD',
        data: { name: 'MacBook Pro 14 inch M3 (16GB/512GB)', price: 39990000, specs: 'M3 8-core CPU, 10-core GPU, Liquid Retina XDR', vendor: 'Thế Giới Di Động' },
        capturedAt: new Date(Date.now() - 86400000).toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'rec-2',
        datasetId: 'demo-ds-1',
        userId: 'demo-user',
        sourceUrl: 'https://fptshop.com.vn/may-tinh-xach-tay/dell-xps-13-plus',
        sourceTitle: 'Dell XPS 13 Plus 9320 i7 16GB - FPT Shop',
        data: { name: 'Dell XPS 13 Plus 9320 i7-1360P', price: 42500000, specs: 'Intel Core i7-1360P, 16GB LPDDR5, 512GB SSD OLED 3.5K', vendor: 'FPT Shop' },
        capturedAt: new Date(Date.now() - 43200000).toISOString(),
        createdAt: new Date(Date.now() - 43200000).toISOString(),
        updatedAt: new Date(Date.now() - 43200000).toISOString()
      },
      {
        id: 'rec-3',
        datasetId: 'demo-ds-1',
        userId: 'demo-user',
        sourceUrl: 'https://cellphones.com.vn/laptop-thinkpad-x1-carbon-gen-11.html',
        sourceTitle: 'Lenovo ThinkPad X1 Carbon Gen 11 - CellphoneS',
        data: { name: 'Lenovo ThinkPad X1 Carbon Gen 11 i7', price: 37990000, specs: 'Intel Core i7-1355U, 16GB RAM, 512GB SSD, WUXGA IPS', vendor: 'CellphoneS' },
        capturedAt: new Date(Date.now() - 10800000).toISOString(),
        createdAt: new Date(Date.now() - 10800000).toISOString(),
        updatedAt: new Date(Date.now() - 10800000).toISOString()
      }
    ];
  }
  if (datasetId === 'demo-ds-2') {
    return [
      {
        id: 'rec-4',
        datasetId: 'demo-ds-2',
        userId: 'demo-user',
        sourceUrl: 'https://vng.com.vn',
        sourceTitle: 'VNG Corporation - Unicorn công nghệ Việt Nam',
        data: { company: 'VNG Corporation', industry: 'Game & Internet', website: 'https://vng.com.vn', email: 'recruitment@vng.com.vn' },
        capturedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
      },
      {
        id: 'rec-5',
        datasetId: 'demo-ds-2',
        userId: 'demo-user',
        sourceUrl: 'https://momo.vn',
        sourceTitle: 'MoMo - Ví điện tử & Fintech hàng đầu',
        data: { company: 'MoMo (M_Service)', industry: 'Fintech & Payment', website: 'https://momo.vn', email: 'talent@mservice.com.vn' },
        capturedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 'rec-6',
        datasetId: 'demo-ds-2',
        userId: 'demo-user',
        sourceUrl: 'https://fpt-software.com',
        sourceTitle: 'FPT Software - Global IT Services',
        data: { company: 'FPT Software', industry: 'Software Services & AI', website: 'https://fpt-software.com', email: 'recruitment@fpt.com' },
        capturedAt: new Date(Date.now() - 86400000).toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
  }
  return [
    {
      id: 'rec-7',
      datasetId: 'demo-ds-3',
      userId: 'demo-user',
      sourceUrl: 'https://arxiv.org/abs/2401.0001',
      sourceTitle: 'Autonomous Multi-Agent Architecture for Modern Enterprise Systems',
      data: { title: 'Autonomous Multi-Agent Architecture', author: 'DeepMind Research Team', summary: 'Nghiên cứu kiến trúc đa tác nhân có khả năng tự kiểm chứng qua loop phản hồi và hợp đồng dữ liệu nghiêm ngặt.', date: '2026-01-15' },
      capturedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 6).toISOString()
    },
    {
      id: 'rec-8',
      datasetId: 'demo-ds-3',
      userId: 'demo-user',
      sourceUrl: 'https://techcrunch.com/2026/02/01/ai-agent-market',
      sourceTitle: 'The Rise of Universal Web Scraper AI Assistants',
      data: { title: 'The Rise of Universal Web Scraper AI Assistants', author: 'TechCrunch Analysis', summary: 'Thị trường trợ lý dữ liệu web đa ngành bùng nổ khi các công ty cần dữ liệu tức thì từ trang web thay vì tích hợp API phức tạp.', date: '2026-02-01' },
      capturedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 4).toISOString()
    }
  ];
}

