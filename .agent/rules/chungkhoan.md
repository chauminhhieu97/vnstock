---
trigger: always_on
---

⚠️ CRITICAL SYSTEM RULES (BẮT BUỘC TUÂN THỦ)
1. ZERO FABRICATION POLICY (Nguyên tắc Không bịa số liệu)
* Tuyệt đối không hard-code (gán cứng) bất kỳ con số cụ thể nào vào biến số liên quan đến giá, tài chính, hoặc chỉ số kỹ thuật.
    * Sai: current_price = 25000, pe_ratio = 10.5
    * Đúng: current_price = df['close'].iloc[-1], pe_ratio = stock.ratio['pe']
* Nếu dữ liệu bị thiếu (NaN) hoặc API lỗi, code phải trả về None hoặc bỏ qua mã cổ phiếu đó. Không được tự ý điền giá trị trung bình hay số ngẫu nhiên để lấp đầy khoảng trống.
2. MANDATORY API DATA SOURCE (Nguồn dữ liệu bắt buộc) Mọi dữ liệu đầu vào phải được lấy thông qua thư viện vnstock (hoặc vnstock3). Bạn không được sử dụng kiến thức có sẵn trong training data (vì nó đã lỗi thời).
3. DATA CLASSIFICATION (Phân loại dữ liệu) Bạn phải phân biệt rõ ràng giữa dữ liệu cần FETCH (Lấy từ API) và dữ liệu cần CALCULATE (Tự tính toán).
A. Dữ liệu KHÔNG ĐƯỢC tự tính (Bắt buộc gọi API)
Đây là các dữ liệu gốc (Raw Data) biến động theo thời gian thực hoặc dữ liệu báo cáo tài chính gốc. Code phải gọi hàm để lấy:
* Dữ liệu thị trường (Market Data):
    * Giá hiện tại (Current Price), Giá đóng cửa (Close).
    * Giá Cao/Thấp/Mở cửa (High/Low/Open).
    * Khối lượng giao dịch (Volume/Trading Volume).
    * Vốn hóa thị trường (Market Cap).
* Dữ liệu Báo cáo tài chính (Financial Statements):
    * Doanh thu (Revenue).
    * Lợi nhuận sau thuế (Net Income/Profit).
    * Lưu chuyển tiền tệ từ HĐKD (Operating Cash Flow - CFO).
    * Tổng tài sản (Total Assets), Vốn chủ sở hữu (Equity).
    * Nợ vay (Total Debt).
* Chỉ số định giá cơ bản (Valuation Ratios - Nếu API hỗ trợ):
    * P/E (Price to Earnings).
    * P/B (Price to Book).
    * EPS (Earning Per Share).
    * Lưu ý: Nếu API không trả về trực tiếp P/E, phải lấy Price chia cho EPS (với EPS lấy từ API), không được tự bịa P/E.
B. Dữ liệu ĐƯỢC PHÉP tự tính (Calculated Metrics)
Từ các dữ liệu gốc ở mục A, code sẽ tính toán các chỉ số sau:
* Tăng trưởng: (Doanh thu năm nay - Doanh thu năm ngoái) / Doanh thu năm ngoái.
* Biên lợi nhuận (Margins): Lợi nhuận / Doanh thu.
* Chỉ số Kỹ thuật (TA): EMA, RSI, MACD, Bollinger Bands (dùng thư viện pandas_ta để tính từ cột Close).
* Tín hiệu (Signals): Logic so sánh (ví dụ: if Close > EMA50).
* Trung vị ngành (Sector Median): Phải lấy danh sách tất cả mã trong ngành -> Lấy P/E của từng mã -> Tính hàm median(). Không được gán cứng một con số (ví dụ: Không được viết steel_median_pe = 8.0).
