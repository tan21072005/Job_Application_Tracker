export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public fields?: Record<string, string>,
    public existing?: { id: string; status: string }
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const result = await fetch(`/api${path}`, { ...options, signal: controller.signal, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers } });
    if (!result.ok) {
      let message = result.status === 401 ? 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.' : result.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.' : result.status === 404 ? 'Dữ liệu không còn tồn tại. Tải lại danh sách để kiểm tra.' : result.status === 409 ? 'Dữ liệu đã thay đổi hoặc bị trùng. Kiểm tra lại trước khi lưu.' : result.status === 412 ? 'Hồ sơ đã được cập nhật ở nơi khác. Tải lại trước khi lưu.' : result.status === 428 ? 'Thiếu phiên bản hồ sơ. Tải lại trước khi lưu.' : result.status === 429 ? 'Bạn thao tác quá nhanh. Chờ một chút rồi thử lại.' : 'Không thể hoàn tất yêu cầu. Hãy thử lại.';
      let code: string | undefined;
      let fields: Record<string, string> | undefined;
      let existing: { id: string; status: string } | undefined;
      if (![403, 429].includes(result.status) && (result.status !== 401 || path === '/auth/login')) {
        try {
          const body = await result.json();
          if (typeof body.message === 'string') message = body.message;
          if (typeof body.code === 'string') code = body.code;
          if (body.fields && typeof body.fields === 'object') fields = body.fields;
          if (body.existing && typeof body.existing === 'object') existing = body.existing;
        } catch { /* Keep actionable fallback. */ }
      }
      if (result.status === 401 && (!options.method || options.method === 'GET') && !['/auth/login', '/auth/register', '/auth/me'].includes(path) && typeof window !== 'undefined') window.dispatchEvent(new Event('jobtrack:session-expired'));
      throw new ApiError(message, result.status, code, fields, existing);
    }
    if (result.status === 204) return undefined as T;
    try { return await result.json(); } catch { throw new ApiError('Máy chủ trả về dữ liệu chưa hợp lệ. Thử tải lại.', 502); }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) throw new ApiError('Kết nối mất quá nhiều thời gian. Kiểm tra mạng rồi thử lại.', 0);
    throw new ApiError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại; nội dung đang nhập vẫn được giữ.', 0);
  } finally { clearTimeout(timer); }
}
