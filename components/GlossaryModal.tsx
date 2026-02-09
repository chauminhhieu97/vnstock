import React from 'react';
import { X, BookOpen, Calculator, Activity, BrainCircuit, Target, ArrowRight, Star, TrendingUp, Globe2 } from 'lucide-react';

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlossaryModal: React.FC<GlossaryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-gray-900">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen size={20} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Phương pháp & Khung Kiến Thức</h2>
              <p className="text-xs text-gray-500 font-medium">Các chỉ số cốt lõi cho thị trường chứng khoán Việt Nam</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto p-6 space-y-8 bg-white">

          {/* SECTION 1: Benchmark Cheat Sheet */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">
              <Target size={16} className="text-red-600" /> Khung Tham Chiếu Nhanh (Benchmarks)
            </h3>
            <p className="text-xs text-gray-500 mb-3 italic">
              * Các chỉ số có dấu <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold mx-1">🔥 Ưu tiên</span> là "chìa khóa" quan trọng nhất tại thị trường VN.
            </p>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3 w-[20%]">Chỉ số</th>
                      <th className="p-3 w-[25%] text-emerald-700 bg-emerald-50/50">✅ Vùng Tốt / Lý Tưởng</th>
                      <th className="p-3 w-[25%] text-rose-700 bg-rose-50/50">⚠️ Vùng Rủi ro / Thận trọng</th>
                      <th className="p-3 w-[30%]">Tại sao quan trọng ở VN?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {/* FA Rows */}
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-bold flex flex-col">
                        <span>P/B (Price/Book)</span>
                        <span className="mt-1 w-fit bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-orange-200">🔥 Ưu tiên</span>
                      </td>
                      <td className="p-3 text-emerald-700 font-mono bg-emerald-50/30">{'<'} 1.5 (Bank/BĐS)</td>
                      <td className="p-3 text-rose-600 font-mono bg-rose-50/30">{'>'} 3.0 (Trừ Tech/Retail)</td>
                      <td className="p-3 text-gray-500">
                        Hơn 60% vốn hóa VN-Index là Bank & BĐS, P/B phản ánh chính xác hơn P/E cho tài sản thực.
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-bold">ROE</td>
                      <td className="p-3 text-emerald-700 font-mono bg-emerald-50/30">{'>'} 15%</td>
                      <td className="p-3 text-rose-600 font-mono bg-rose-50/30">{'<'} 10%</td>
                      <td className="p-3 text-gray-500">Chất lượng doanh nghiệp. Cổ phiếu "xịn" ở VN thường duy trì ROE {'>'} 17%.</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-bold">P/E</td>
                      <td className="p-3 text-emerald-700 font-mono bg-emerald-50/30">10x - 15x</td>
                      <td className="p-3 text-rose-600 font-mono bg-rose-50/30">{'>'} 25x (Hoặc âm)</td>
                      <td className="p-3 text-gray-500">Dùng cho ngành sản xuất, bán lẻ (VNM, MWG, FPT).</td>
                    </tr>
                    
                    {/* TA Rows */}
                    <tr className="hover:bg-gray-50 border-t-2 border-gray-100">
                      <td className="p-3 font-bold flex flex-col">
                         <span>Volume (Khối lượng)</span>
                         <span className="mt-1 w-fit bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-orange-200">🔥 Ưu tiên</span>
                      </td>
                      <td className="p-3 text-emerald-700 font-mono bg-emerald-50/30">{'>'} 1.5x Trung bình 20 phiên</td>
                      <td className="p-3 text-rose-600 font-mono bg-rose-50/30">Mất thanh khoản</td>
                      <td className="p-3 text-gray-500">
                        "Dòng tiền là Vua". Ở VN, giá tăng mà Volume thấp thì dễ là "kéo ảo" (Bull trap).
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-bold flex flex-col">
                        <span>RS Rating</span>
                         <span className="mt-1 w-fit bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-orange-200">🔥 Ưu tiên</span>
                      </td>
                      <td className="p-3 text-emerald-700 font-mono bg-emerald-50/30">{'>'} 80 (Leader)</td>
                      <td className="p-3 text-rose-600 font-mono bg-rose-50/30">{'<'} 40</td>
                      <td className="p-3 text-gray-500">Tìm siêu cổ phiếu. Cổ phiếu mạnh thường giữ giá khi thị trường chỉnh.</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-bold">Khối Ngoại (Foreign)</td>
                      <td className="p-3 text-emerald-700 font-mono bg-emerald-50/30">Mua ròng liên tiếp</td>
                      <td className="p-3 text-rose-600 font-mono bg-rose-50/30">Bán ròng mạnh</td>
                      <td className="p-3 text-gray-500">Tác động tâm lý lớn. Khối ngoại mua thường tạo đáy dài hạn.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
          
          {/* SECTION 2: Fundamental Analysis */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-600 uppercase tracking-wider mb-4 border-b border-emerald-100 pb-2">
              <Calculator size={16} /> Chi tiết: Phân tích cơ bản (Fundamental)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900">P/B (Price to Book)</span>
                  <span className="text-[10px] font-mono bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-200 font-bold">Quan trọng cho Bank/BĐS</span>
                </div>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  So sánh giá cổ phiếu với giá trị sổ sách (tài sản thực). Phù hợp định giá Ngân hàng, Chứng khoán, Bất động sản.
                </p>
                <div className="bg-white p-2 rounded border border-dashed border-gray-300 font-mono text-[10px] text-gray-700">
                  P/B = Giá thị trường / (Tổng tài sản - Nợ / Số CP)
                </div>
                <p className="text-[10px] text-gray-500 mt-2 italic">
                  📌 P/B {'<'} 1: Cổ phiếu đang giao dịch dưới giá trị thanh lý tài sản (Rẻ).
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900">ROE (Return on Equity)</span>
                  <span className="text-[10px] font-mono bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">Chất lượng</span>
                </div>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  Hiệu quả sử dụng vốn. Warren Buffett thích chỉ số này nhất.
                </p>
                <div className="bg-white p-2 rounded border border-dashed border-gray-300 font-mono text-[10px] text-gray-700">
                  ROE = Lợi nhuận sau thuế / Vốn chủ sở hữu
                </div>
                <p className="text-[10px] text-gray-500 mt-2 italic">📌 Ở VN, doanh nghiệp tốt thường duy trì ROE trên 15% trong 3 năm.</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900">P/E (Price to Earning)</span>
                  <span className="text-[10px] font-mono bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">Thời gian hoàn vốn</span>
                </div>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  Số năm thu hồi vốn nếu lợi nhuận không đổi. Chỉ dùng cho doanh nghiệp lợi nhuận ổn định.
                </p>
                <div className="bg-white p-2 rounded border border-dashed border-gray-300 font-mono text-[10px] text-gray-700">
                  P/E = 10 (cần 10 năm hoàn vốn)
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900">Debt / Equity</span>
                  <span className="text-[10px] font-mono bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">An toàn</span>
                </div>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  Tỷ lệ vay nợ. Trong môi trường lãi suất cao, doanh nghiệp vay nhiều sẽ bị "ăn mòn" lợi nhuận.
                </p>
                <p className="text-[10px] text-gray-500 mt-2 italic">📌 Tránh xa các mã Bất động sản có D/E {'>'} 1.5 khi lãi suất tăng.</p>
              </div>

            </div>
          </section>

          {/* SECTION 3: Technical Analysis */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-blue-100 pb-2">
              <Activity size={16} /> Chi tiết: Phân tích kỹ thuật (Technical)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900">Volume & VSA</span>
                  <span className="text-[10px] font-mono bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-200 font-bold">Dòng tiền</span>
                </div>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  Phân tích hành vi của "Nhà tạo lập" (Big Boys). Giá tăng phải kèm Volume tăng.
                </p>
                <div className="bg-white p-2 rounded border border-dashed border-gray-300 font-mono text-[10px] text-gray-700">
                  Breakout: Giá vượt đỉnh + Volume {'>'} 150% trung bình.
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900">RS Rating (Sức mạnh giá)</span>
                  <span className="text-[10px] font-mono bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-200 font-bold">So sánh</span>
                </div>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  So sánh sức mạnh cổ phiếu với toàn bộ thị trường.
                </p>
                <div className="bg-white p-2 rounded border border-dashed border-gray-300 font-mono text-[10px] text-gray-700">
                  RS 90 = Cổ phiếu mạnh hơn 90% các mã còn lại trên sàn.
                </div>
                <p className="text-[10px] text-gray-500 mt-2 italic">📌 Khi VN-Index giảm, mã nào RS cao mà giữ được giá là Siêu cổ phiếu.</p>
              </div>

               <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900">MACD</span>
                  <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200">Xu hướng</span>
                </div>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  Chỉ báo xác định xu hướng trung hạn.
                </p>
                <div className="bg-white p-2 rounded border border-dashed border-gray-300 font-mono text-[10px] text-gray-700">
                  Giao cắt vàng (Golden Cross): Đường MACD cắt lên đường Tín hiệu.
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900">Nước ngoài (Foreign Flow)</span>
                  <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200">Tâm lý</span>
                </div>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  Khối ngoại thường mua ròng ở vùng đáy và bán ròng ở vùng đỉnh.
                </p>
                <div className="bg-white p-2 rounded border border-dashed border-gray-300 font-mono text-[10px] text-gray-700">
                  Theo dõi chuỗi mua/bán ròng liên tiếp 5-10 phiên.
                </div>
              </div>

            </div>
          </section>

          {/* SECTION 4: AI Hybrid */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-purple-600 uppercase tracking-wider mb-4 border-b border-purple-100 pb-2">
              <BrainCircuit size={16} /> Hybrid Score (Độc quyền)
            </h3>
            <div className="bg-purple-50 p-5 rounded-xl border border-purple-200">
              <p className="text-xs text-gray-600 mb-4 text-center max-w-2xl mx-auto">
                Chúng tôi tổng hợp các chỉ số trên thành một điểm số duy nhất để bạn ra quyết định nhanh chóng.
              </p>
              
              <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
                <div className="flex-1 w-full bg-white p-3 rounded-lg border border-purple-100 text-center shadow-sm">
                  <div className="text-blue-600 font-bold text-lg">40%</div>
                  <div className="text-[10px] uppercase font-bold text-gray-500">Technical</div>
                  <div className="text-[10px] text-gray-500 mt-1">(RSI + RS Rating + MACD)</div>
                </div>
                <div className="text-gray-400 font-bold">+</div>
                <div className="flex-1 w-full bg-white p-3 rounded-lg border border-purple-100 text-center shadow-sm">
                  <div className="text-emerald-600 font-bold text-lg">30%</div>
                  <div className="text-[10px] uppercase font-bold text-gray-500">Fundamental</div>
                  <div className="text-[10px] text-gray-500 mt-1">(ROE + P/B + Growth)</div>
                </div>
                <div className="text-gray-400 font-bold">+</div>
                <div className="flex-1 w-full bg-white p-3 rounded-lg border border-purple-100 text-center shadow-sm">
                  <div className="text-purple-600 font-bold text-lg">30%</div>
                  <div className="text-[10px] uppercase font-bold text-gray-500">Sentiment AI</div>
                  <div className="text-[10px] text-gray-500 mt-1">(Tin tức + Khối ngoại)</div>
                </div>
              </div>
            </div>
          </section>

        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-[10px] text-gray-500">
            Lưu ý: Các chỉ số chỉ mang tính chất tham khảo. Thị trường Việt Nam có tính biến động cao, hãy quản trị rủi ro chặt chẽ.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GlossaryModal;