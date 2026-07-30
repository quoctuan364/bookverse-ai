import { createHash } from "node:crypto";
import { EditionType, ListingCondition, ListingStatus, Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import {
  CATALOG_STORE_USER_ID,
  CATALOG_STORE_EMAIL,
  CATALOG_STORE_NAME,
} from "../lib/catalog-listing-sync";

interface ChapterBlueprint {
  title: string;
  focus: string;
  reflection: string;
}

interface EbookSeed {
  bookId: string;
  price: number;
  chapters: ChapterBlueprint[];
}

// Đây là nội dung mẫu do BookVerse biên soạn để demo pipeline, không sao chép nguyên tác.
const EBOOK_SEEDS: EbookSeed[] = [
  {
    bookId: "RB00339",
    price: 89_000,
    chapters: [
      { title: "Từ ý tưởng đến phom dáng", focus: "quan sát cơ thể, công năng và tỷ lệ trước khi dựng mẫu", reflection: "một thiết kế đẹp cần giải quyết nhu cầu nào của người mặc" },
      { title: "Hiểu vật liệu", focus: "phân biệt độ rủ, độ co và hướng sợi của các nhóm vải phổ biến", reflection: "vật liệu thay đổi quyết định thiết kế ra sao" },
      { title: "Quy trình may có kiểm soát", focus: "chia công việc thành các mốc đo, cắt, ráp và hoàn thiện", reflection: "điểm kiểm tra nào giúp phát hiện lỗi sớm nhất" },
      { title: "Hoàn thiện một sản phẩm", focus: "đánh giá đường may, độ vừa vặn và trải nghiệm sử dụng", reflection: "thế nào là một sản phẩm sẵn sàng bàn giao" },
    ],
  },
  {
    bookId: "RB00047",
    price: 69_000,
    chapters: [
      { title: "Hệ sinh thái quanh ta", focus: "nhìn môi trường như một mạng lưới sinh vật và điều kiện sống", reflection: "một thay đổi nhỏ có thể lan truyền qua hệ sinh thái thế nào" },
      { title: "Dòng năng lượng", focus: "tìm hiểu vai trò của sinh vật sản xuất, tiêu thụ và phân giải", reflection: "vì sao năng lượng giảm dần qua mỗi bậc dinh dưỡng" },
      { title: "Cân bằng và biến động", focus: "quan sát sức chống chịu của tự nhiên trước biến đổi", reflection: "khi nào một hệ sinh thái vượt qua giới hạn phục hồi" },
      { title: "Hành động có căn cứ", focus: "biến hiểu biết sinh thái thành lựa chọn hằng ngày có thể đo lường", reflection: "một hành động nhỏ nào có tác động dài hạn" },
    ],
  },
  {
    bookId: "RB00061",
    price: 79_000,
    chapters: [
      { title: "Tín hiệu trước cơn sóng", focus: "đọc bối cảnh, nhận diện rủi ro và chuẩn bị phương án", reflection: "dữ kiện nào thường bị bỏ qua khi áp lực tăng cao" },
      { title: "Ra quyết định giữa bất định", focus: "tách điều đã biết, điều giả định và điều cần kiểm chứng", reflection: "quyết định tốt khác quyết định nhanh ở điểm nào" },
      { title: "Đội ngũ trong nghịch cảnh", focus: "duy trì giao tiếp rõ ràng và phân vai khi tình huống thay đổi", reflection: "niềm tin được xây bằng hành vi cụ thể nào" },
      { title: "Sau vùng nước dữ", focus: "tổng kết bài học và biến trải nghiệm thành năng lực bền vững", reflection: "bài học nào cần được ghi lại ngay sau biến cố" },
    ],
  },
  {
    bookId: "RB00074",
    price: 59_000,
    chapters: [
      { title: "Dừng lại để nhận biết", focus: "quan sát hơi thở và trạng thái hiện tại mà không phán xét", reflection: "điều gì xuất hiện khi ta thôi vội vàng" },
      { title: "Không gian của tĩnh lặng", focus: "tạo những khoảng nghỉ ngắn giữa nhịp sống nhiều kích thích", reflection: "một phút yên lặng có thể thay đổi phản ứng ra sao" },
      { title: "Chăm sóc cảm xúc", focus: "gọi tên cảm xúc và lựa chọn cách đáp lại có ý thức", reflection: "ta đang phản ứng với sự việc hay với suy diễn của mình" },
      { title: "Mang thực tập vào đời sống", focus: "xây dựng thói quen chú tâm khi đi, ăn, làm việc và trò chuyện", reflection: "thực tập nào phù hợp nhất với lịch sinh hoạt hiện tại" },
    ],
  },
  {
    bookId: "RB00123",
    price: 99_000,
    chapters: [
      { title: "Quan sát hiện trường", focus: "ghi nhận dữ kiện trước khi hình thành kết luận", reflection: "chi tiết nào là sự thật và chi tiết nào mới chỉ là diễn giải" },
      { title: "Lập bản đồ giả thuyết", focus: "xây nhiều khả năng cạnh tranh thay vì bám vào phỏng đoán đầu tiên", reflection: "bằng chứng nào có thể bác bỏ giả thuyết đang ưa thích" },
      { title: "Kiểm tra lời kể", focus: "so sánh thời gian, động cơ và tính nhất quán của thông tin", reflection: "mâu thuẫn nào đáng kiểm tra trước" },
      { title: "Kết luận có trách nhiệm", focus: "trình bày chuỗi suy luận rõ ràng và thừa nhận giới hạn dữ liệu", reflection: "mức độ chắc chắn của kết luận nên được diễn đạt thế nào" },
    ],
  },
  {
    bookId: "RB00208",
    price: 109_000,
    chapters: [
      { title: "Nhiều tiếng nói trong một câu chuyện", focus: "nhận ra góc nhìn, thời gian và ký ức có thể đan xen", reflection: "người kể chuyện đã làm thay đổi điều ta tin như thế nào" },
      { title: "Thời gian của ký ức", focus: "đọc các dấu hiệu chuyển cảnh và liên hệ giữa hiện tại với quá khứ", reflection: "ký ức nào đang chi phối hành động hiện tại" },
      { title: "Đọc điều không được nói", focus: "tìm ý nghĩa trong khoảng lặng, nhịp câu và hình ảnh lặp lại", reflection: "chi tiết nào trở nên quan trọng nhờ sự lặp lại" },
      { title: "Tổng hợp hành trình đọc", focus: "xâu chuỗi chủ đề, nhân vật và biến đổi cảm xúc", reflection: "cách hiểu nào đã thay đổi sau khi nhìn lại toàn bộ cấu trúc" },
    ],
  },
  {
    bookId: "RB03002",
    price: 129_000,
    chapters: [
      { title: "Mô hình thực thi JavaScript", focus: "phân biệt mã nguồn, môi trường thực thi và các giai đoạn xử lý", reflection: "điều gì thực sự xảy ra trước khi một dòng lệnh chạy" },
      { title: "Phạm vi và closure", focus: "theo dõi nơi biến được khai báo, truy cập và giữ lại", reflection: "closure đang giúp quản lý trạng thái hay che giấu thiết kế khó hiểu" },
      { title: "Bất đồng bộ có cấu trúc", focus: "tổ chức luồng công việc với promise, async và xử lý lỗi", reflection: "lỗi sẽ đi đâu khi một tác vụ bất đồng bộ thất bại" },
      { title: "Thiết kế mã dễ kiểm chứng", focus: "viết hàm nhỏ, hợp đồng rõ và kiểm thử được", reflection: "đoạn mã nào nên được tách để giảm số điều phải ghi nhớ cùng lúc" },
    ],
  },
];

function buildParagraphs(
  title: string,
  authorName: string,
  chapter: ChapterBlueprint,
  chapterNumber: number,
): string[] {
  return [
    `Chương ${chapterNumber} mở ra một góc tiếp cận thực hành cho “${title}”. Thay vì lặp lại nội dung nguyên tác, bản mẫu BookVerse dùng chủ đề ${chapter.focus} để minh họa cách một chương Ebook được tổ chức thành các đoạn độc lập, có thể đọc, đánh dấu và tìm kiếm.`,
    `Người đọc nên bắt đầu bằng việc ghi lại điều mình đã biết, sau đó đối chiếu với ví dụ gần gũi. Cách học này biến việc đọc thành một chu trình gồm quan sát, đặt câu hỏi, thử nghiệm và tự giải thích. Tên tác giả ${authorName} được giữ như metadata của đầu sách; toàn bộ đoạn văn trong bản demo này do BookVerse biên soạn.`,
    `Bài tập ngắn: hãy viết ba dữ kiện liên quan đến ${chapter.focus}, đánh dấu một câu quan trọng và thêm ghi chú bằng ngôn ngữ của bạn. Khi chuyển chương, hệ thống sẽ lưu vị trí hiện tại cùng phần trăm hoàn thành để bạn có thể tiếp tục ở lần đọc sau.`,
    `Câu hỏi suy ngẫm cuối chương: ${chapter.reflection}? Không cần trả lời ngay. Hãy dùng câu hỏi này như một điểm neo để xem lại ghi chú, kiểm tra giả định và kết nối nội dung với trải nghiệm thực tế.`,
  ];
}

function stableChunkId(bookId: string, chapterNumber: number, chunkIndex: number): string {
  return `BV-CHUNK-${bookId}-${String(chapterNumber).padStart(2, "0")}-${String(chunkIndex).padStart(3, "0")}`;
}

async function main() {
  const store = await prisma.user.upsert({
    where: { id: CATALOG_STORE_USER_ID },
    update: { email: CATALOG_STORE_EMAIL, name: CATALOG_STORE_NAME, role: "SELLER" },
    create: {
      id: CATALOG_STORE_USER_ID,
      email: CATALOG_STORE_EMAIL,
      name: CATALOG_STORE_NAME,
      role: "SELLER",
    },
    select: { id: true },
  });

  const report: Array<{ bookId: string; title: string; chapters: number; chunks: number; price: number }> = [];

  for (const seed of EBOOK_SEEDS) {
    const book = await prisma.book.findUnique({
      where: { id: seed.bookId },
      select: {
        id: true,
        title: true,
        authorName: true,
        languageCode: true,
        coverPath: true,
      },
    });

    if (!book) {
      throw new Error(`Không tìm thấy đầu sách ${seed.bookId}.`);
    }

    const chunks = seed.chapters.flatMap((chapter, chapterOffset) => {
      const chapterNumber = chapterOffset + 1;
      return buildParagraphs(book.title, book.authorName, chapter, chapterNumber).map(
        (content, chunkIndex) => ({
          id: stableChunkId(book.id, chapterNumber, chunkIndex),
          bookId: book.id,
          chapterNumber,
          chapterTitle: chapter.title,
          pageNumber: chapterOffset * 4 + chunkIndex + 1,
          chunkIndex,
          content,
          embedding: {
            status: "PENDING",
            source: "BOOKVERSE_AUTHORED_SAMPLE",
          } satisfies Prisma.InputJsonValue,
        }),
      );
    });
    const editionId = `BV-EDITION-EBOOK-${book.id}`;
    const listingId = `BV-EBOOK-${book.id}`;
    const assetContentHash = createHash("sha256")
      .update(chunks.map((chunk) => chunk.content).join("\n\n"))
      .digest("hex");

    await prisma.$transaction(async (tx) => {
      await tx.bookEdition.upsert({
        where: { id: editionId },
        update: {
          editionType: EditionType.EBOOK,
          price: seed.price,
          stock: 999,
          languageCode: book.languageCode,
          isActive: true,
        },
        create: {
          id: editionId,
          bookId: book.id,
          editionType: EditionType.EBOOK,
          price: seed.price,
          stock: 999,
          languageCode: book.languageCode,
          isActive: true,
        },
      });

      await tx.digitalAsset.upsert({
        where: { editionId },
        update: {
          fileUrl: `/read/${book.id}`,
          fileHash: assetContentHash,
          samplePages: 4,
          mimeType: "application/vnd.bookverse.chunks+json",
          fileSize: Buffer.byteLength(chunks.map((chunk) => chunk.content).join("\n\n"), "utf8"),
        },
        create: {
          id: `BV-ASSET-EBOOK-${book.id}`,
          editionId,
          fileUrl: `/read/${book.id}`,
          fileHash: assetContentHash,
          samplePages: 4,
          mimeType: "application/vnd.bookverse.chunks+json",
          fileSize: Buffer.byteLength(chunks.map((chunk) => chunk.content).join("\n\n"), "utf8"),
        },
      });

      for (const chunk of chunks) {
        await tx.bookChunk.upsert({
          where: {
            bookId_chapterNumber_chunkIndex: {
              bookId: chunk.bookId,
              chapterNumber: chunk.chapterNumber,
              chunkIndex: chunk.chunkIndex,
            },
          },
          update: {
            id: chunk.id,
            chapterTitle: chunk.chapterTitle,
            pageNumber: chunk.pageNumber,
            content: chunk.content,
            embedding: chunk.embedding,
          },
          create: chunk,
        });
      }

      await tx.listing.upsert({
        where: { id: listingId },
        update: {
          sellerId: store.id,
          bookId: book.id,
          editionId,
          title: `Ebook · ${book.title}`,
          description: `Bản Ebook mẫu có cấu trúc chương do BookVerse biên soạn cho ${book.title}. Có mục lục, lưu tiến độ, highlight và ghi chú.`,
          condition: ListingCondition.DIGITAL,
          price: seed.price,
          status: ListingStatus.APPROVED,
          stock: 999,
          tags: ["ebook", "bookverse-authored-sample", book.languageCode ?? "unknown"],
          hasCover: Boolean(book.coverPath),
          reviewedAt: new Date(),
          hiddenAt: null,
        },
        create: {
          id: listingId,
          sellerId: store.id,
          bookId: book.id,
          editionId,
          title: `Ebook · ${book.title}`,
          description: `Bản Ebook mẫu có cấu trúc chương do BookVerse biên soạn cho ${book.title}. Có mục lục, lưu tiến độ, highlight và ghi chú.`,
          condition: ListingCondition.DIGITAL,
          price: seed.price,
          status: ListingStatus.APPROVED,
          stock: 999,
          tags: ["ebook", "bookverse-authored-sample", book.languageCode ?? "unknown"],
          hasCover: Boolean(book.coverPath),
          reviewedAt: new Date(),
        },
      });
    });

    report.push({
      bookId: book.id,
      title: book.title,
      chapters: seed.chapters.length,
      chunks: chunks.length,
      price: seed.price,
    });
  }

  console.table(report);
  console.log(`Đã đồng bộ ${report.length} Ebook, ${report.reduce((sum, item) => sum + item.chunks, 0)} chunks.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
