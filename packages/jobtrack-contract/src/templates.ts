import type { DatasetColumnDefinition, DatasetCategory } from './types.ts';

export interface TemplatePack {
  id: string;
  category: DatasetCategory;
  name: string;
  description: string;
  columns: DatasetColumnDefinition[];
}

export const PRODUCT_RESEARCH_TEMPLATE: TemplatePack = {
  id: 'template_product_research',
  category: 'product_research',
  name: 'So sánh sản phẩm & Nhà cung cấp',
  description: 'Trích xuất thông tin sản phẩm, giá bán, nhà cung cấp, thông số kỹ thuật và liên kết để so sánh đối chiếu.',
  columns: [
    { key: 'name', label: 'Tên sản phẩm', type: 'text', required: true },
    { key: 'price', label: 'Giá bán', type: 'currency', required: true, unit: 'VND' },
    { key: 'originalPrice', label: 'Giá gốc', type: 'currency', unit: 'VND' },
    { key: 'seller', label: 'Nhà bán / Nhà cung cấp', type: 'text' },
    { key: 'rating', label: 'Đánh giá (sao)', type: 'number' },
    { key: 'specifications', label: 'Thông số / Mô tả', type: 'text' },
    { key: 'url', label: 'Đường dẫn sản phẩm', type: 'url' }
  ]
};

export const RESEARCH_NOTES_TEMPLATE: TemplatePack = {
  id: 'template_research_notes',
  category: 'research_notes',
  name: 'Ghi chú & Tổng hợp nghiên cứu',
  description: 'Trích xuất bài viết, tiêu đề, tác giả, trích dẫn quan trọng và tóm tắt có nguồn dẫn chứng.',
  columns: [
    { key: 'title', label: 'Tiêu đề bài viết', type: 'text', required: true },
    { key: 'author', label: 'Tác giả / Nhà xuất bản', type: 'text' },
    { key: 'publishDate', label: 'Ngày công bố', type: 'date' },
    { key: 'summary', label: 'Tóm tắt nội dung', type: 'text' },
    { key: 'keyQuotes', label: 'Trích dẫn then chốt', type: 'text' },
    { key: 'url', label: 'Nguồn bài viết', type: 'url' }
  ]
};

export const COMPANY_LIST_TEMPLATE: TemplatePack = {
  id: 'template_company_list',
  category: 'company_list',
  name: 'Danh sách doanh nghiệp & Đối tác',
  description: 'Thu thập danh sách công ty, ngành nghề, liên hệ, địa chỉ từ các danh bạ và trang tin doanh nghiệp.',
  columns: [
    { key: 'companyName', label: 'Tên doanh nghiệp', type: 'text', required: true },
    { key: 'industry', label: 'Ngành nghề kinh doanh', type: 'text' },
    { key: 'website', label: 'Website', type: 'url' },
    { key: 'contactEmail', label: 'Email liên hệ', type: 'text' },
    { key: 'phone', label: 'Số điện thoại', type: 'text' },
    { key: 'address', label: 'Địa chỉ', type: 'text' }
  ]
};

export const JOBTRACK_TEMPLATE: TemplatePack = {
  id: 'template_jobtrack',
  category: 'jobtrack',
  name: 'Quản lý tuyển dụng JobTrack (Core)',
  description: 'Trích xuất tin tuyển dụng từ các sàn việc làm và đồng bộ trực tiếp vào bảng Kanban ứng tuyển.',
  columns: [
    { key: 'company', label: 'Công ty', type: 'text', required: true },
    { key: 'position', label: 'Vị trí tuyển dụng', type: 'text', required: true },
    { key: 'salary', label: 'Mức lương', type: 'text' },
    { key: 'workMode', label: 'Hình thức', type: 'text' },
    { key: 'location', label: 'Địa điểm', type: 'text' },
    { key: 'notes', label: 'Tóm tắt JD', type: 'text' },
    { key: 'url', label: 'Link tin tuyển dụng', type: 'url' }
  ]
};

export const BUILT_IN_TEMPLATES: TemplatePack[] = [
  PRODUCT_RESEARCH_TEMPLATE,
  RESEARCH_NOTES_TEMPLATE,
  COMPANY_LIST_TEMPLATE,
  JOBTRACK_TEMPLATE
];
