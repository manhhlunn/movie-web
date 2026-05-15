import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GOOGLE_AI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google AI API key is not configured.' },
      { status: 500 }
    );
  }

  try {
    const { movieName, originName, description, categories, year } = await req.json();

    const modelName = 'gemini-3-flash-preview';
    console.log(`Using AI model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
      Bạn là một chuyên gia phê bình điện ảnh cao cấp. Hãy phân tích cực kỳ chi tiết bộ phim sau đây:
      - Tên phim: ${movieName}
      - Tên gốc: ${originName}
      - Năm sản xuất: ${year}
      - Thể loại: ${categories}
      - Tóm tắt sơ bộ: ${description}

      Yêu cầu phân tích chi tiết bằng Tiếng Việt:
      1. Đánh giá tổng quan (Review): Nhận xét sâu sắc về giá trị nghệ thuật và giải trí.
      2. Điểm số (Score): Đưa ra mức điểm dự đoán trên thang 10.
      3. Thể loại đặc trưng (Genre): Xác định chính xác các dòng phim mà tác phẩm này thuộc về.
      4. Danh sách nhân vật (Characters): Mô tả các nhân vật chính và tính cách của họ.
      5. Cốt truyện đầy đủ (Full Plot): Tóm tắt toàn bộ diễn biến quan trọng của phim.
      6. Loại kết thúc (Type of Ending): Phân tích xem đây là kết thúc có hậu, buồn, mở hay bất ngờ.

      Trả về kết quả dưới dạng JSON thuần túy với cấu trúc:
      {
        "review": "nội dung đánh giá",
        "score": "điểm số/10",
        "genre": "thể loại chi tiết",
        "characters": "mô tả nhân vật",
        "plot": "cốt truyện chi tiết",
        "endingType": "phân tích kết thúc"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('AI Response Text:', text);

    // More robust JSON extraction
    let jsonStr = text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    try {
      const analysis = JSON.parse(jsonStr);
      return NextResponse.json(analysis);
    } catch (parseError) {
      console.error('JSON Parse Error. Raw text:', text);
      return NextResponse.json(
        { error: 'Phản hồi từ AI không đúng định dạng. Vui lòng thử lại.', raw: text },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json(
      { error: error.message || 'Không thể tạo phân tích AI.' },
      { status: 500 }
    );
  }
}
