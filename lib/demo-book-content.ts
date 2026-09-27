import { createHash } from "node:crypto";

export const DEMO_CONTENT_LABEL = "NỘI_DUNG_DEMO_BOOKVERSE";
export const DEMO_CONTENT_DISCLAIMER =
  "Nội dung minh họa do BookVerse biên soạn để trình diễn hệ thống; không phải bản dịch, trích đoạn hoặc nội dung nguyên tác.";

export interface DemoBookMetadata {
  bookId: string;
  title: string;
  authorName: string;
  categoryName: string;
}

export interface DemoBookPage {
  chapterNumber: number;
  chapterTitle: string;
  pageNumber: number;
  chunkIndex: number;
  content: string;
}

interface TopicProfile {
  concepts: string[];
  settings: string[];
  actions: string[];
  counterpoints: string[];
}

const CHAPTERS = [
  {
    title: "Khởi động hành trình",
    goal: "xác định mục tiêu đọc và câu hỏi trung tâm",
  },
  {
    title: "Nhìn rõ bối cảnh",
    goal: "nhận diện con người, nguồn lực và giới hạn của tình huống",
  },
  {
    title: "Xây nền khái niệm",
    goal: "liên kết các ý tưởng thành một mô hình dễ nhớ",
  },
  {
    title: "Thử nghiệm qua tình huống",
    goal: "đưa kiến thức vào một bài toán gần với đời sống",
  },
  {
    title: "Phân tích và lựa chọn",
    goal: "so sánh phương án bằng tiêu chí và bằng chứng",
  },
  {
    title: "Thực hành có phản hồi",
    goal: "tạo một sản phẩm nhỏ và tự đánh giá kết quả",
  },
  {
    title: "Phản biện giới hạn",
    goal: "kiểm tra giả định và tìm cách giải thích đối lập",
  },
  {
    title: "Tổng hợp thành hành động",
    goal: "chuyển ghi chú thành kế hoạch áp dụng sau khi đọc",
  },
] as const;

const DEFAULT_PROFILE: TopicProfile = {
  concepts: [
    "mục tiêu",
    "bằng chứng",
    "bối cảnh",
    "lựa chọn",
    "phản hồi",
    "giới hạn",
    "thói quen",
    "tiến bộ",
  ],
  settings: [
    "một nhóm sinh viên chuẩn bị bài thuyết trình",
    "một câu lạc bộ muốn tổ chức hoạt động mới",
    "một gia đình cần thống nhất kế hoạch cuối tuần",
    "một cửa hàng nhỏ muốn cải thiện trải nghiệm khách hàng",
  ],
  actions: [
    "viết ba câu tóm tắt bằng ngôn ngữ của mình",
    "lập bảng so sánh hai phương án",
    "đặt một câu hỏi phản biện cho kết luận đầu tiên",
    "chọn một việc có thể hoàn thành trong mười lăm phút",
  ],
  counterpoints: [
    "dữ kiện có thể chưa đủ đại diện",
    "một kết quả tốt trong ngắn hạn có thể tạo chi phí dài hạn",
    "cùng một giải pháp không phù hợp với mọi người",
    "thứ dễ đo chưa chắc là điều quan trọng nhất",
  ],
};

const PROFILES: Array<{ keywords: string[]; profile: TopicProfile }> = [
  {
    keywords: ["công nghệ", "technology", "computer", "lập trình", "software", "ai"],
    profile: {
      concepts: [
        "dữ liệu",
        "thuật toán",
        "giao diện",
        "tự động hóa",
        "độ tin cậy",
        "quyền riêng tư",
        "khả năng mở rộng",
        "trải nghiệm người dùng",
      ],
      settings: [
        "một nhóm sinh viên xây ứng dụng quản lý thư viện",
        "một cửa hàng muốn tự động hóa việc theo dõi tồn kho",
        "một lớp học thử dùng trợ lý số để tổng hợp câu hỏi",
        "một đội dự án phải lựa chọn giữa tốc độ và độ ổn định",
      ],
      actions: [
        "vẽ luồng dữ liệu từ đầu vào đến kết quả",
        "liệt kê ba trường hợp hệ thống có thể trả kết quả sai",
        "viết tiêu chí chấp nhận cho một tính năng nhỏ",
        "thử giải thích thuật toán cho người không học công nghệ",
      ],
      counterpoints: [
        "tự động hóa có thể khuếch đại dữ liệu đầu vào kém",
        "một mô hình chính xác chưa chắc tạo trải nghiệm dễ dùng",
        "tối ưu tốc độ có thể làm giảm khả năng giải thích",
        "thu thập thêm dữ liệu luôn đi kèm trách nhiệm bảo vệ người dùng",
      ],
    },
  },
  {
    keywords: ["kinh doanh", "business", "marketing", "quản trị", "tài chính", "startup"],
    profile: {
      concepts: [
        "giá trị khách hàng",
        "chi phí cơ hội",
        "dòng tiền",
        "định vị",
        "năng lực vận hành",
        "rủi ro",
        "đo lường",
        "tăng trưởng bền vững",
      ],
      settings: [
        "một cửa hàng sách muốn giữ khách quay lại",
        "một nhóm khởi nghiệp chỉ còn ngân sách cho một thử nghiệm",
        "một doanh nghiệp nhỏ đang cân nhắc mở thêm kênh bán",
        "một người quản lý cần xử lý mục tiêu xung đột giữa hai nhóm",
      ],
      actions: [
        "viết giả thuyết kinh doanh có thể kiểm chứng trong một tuần",
        "phân biệt doanh thu, lợi nhuận và dòng tiền trong ví dụ",
        "chọn một chỉ số chính và một chỉ số cảnh báo",
        "mô tả khách hàng mục tiêu bằng nhu cầu thay vì tuổi tác",
      ],
      counterpoints: [
        "tăng doanh thu không đồng nghĩa tăng lợi nhuận",
        "phản hồi của khách hàng nhiệt tình có thể không đại diện số đông",
        "một chiến thuật tăng trưởng nhanh có thể làm yếu niềm tin",
        "chỉ số dễ tăng có thể không phản ánh giá trị thật",
      ],
    },
  },
  {
    keywords: ["văn học", "literature", "tiểu thuyết", "fiction", "poetry", "truyện"],
    profile: {
      concepts: [
        "điểm nhìn",
        "xung đột",
        "không gian",
        "ký ức",
        "biểu tượng",
        "nhịp kể",
        "động cơ",
        "sự thay đổi",
      ],
      settings: [
        "một nhân vật phải chọn giữa lời hứa và cơ hội mới",
        "một khu phố thay đổi sau khi bí mật cũ được nhắc lại",
        "hai người kể cùng mô tả một sự kiện nhưng nhớ khác nhau",
        "một lá thư đến muộn làm thay đổi cách hiểu về quá khứ",
      ],
      actions: [
        "viết lại một cảnh từ điểm nhìn của nhân vật phụ",
        "chọn một đồ vật và giải thích ba ý nghĩa có thể có",
        "phác thảo xung đột bằng hai mong muốn đối lập",
        "viết đoạn kết khác nhưng vẫn giữ logic nhân vật",
      ],
      counterpoints: [
        "người kể chuyện có thể không đáng tin",
        "ý nghĩa của biểu tượng phụ thuộc vào bối cảnh",
        "động cơ được nói ra có thể khác động cơ thật",
        "một kết thúc hợp lý không nhất thiết là kết thúc dễ chịu",
      ],
    },
  },
  {
    keywords: ["lịch sử", "history", "chính trị", "politic", "xã hội", "society"],
    profile: {
      concepts: [
        "nguồn tư liệu",
        "bối cảnh",
        "quyền lực",
        "lợi ích",
        "thay đổi",
        "tính liên tục",
        "ký ức tập thể",
        "góc nhìn",
      ],
      settings: [
        "một thị trấn phải ghi lại sự kiện qua nhiều nguồn mâu thuẫn",
        "một chính sách mới tạo lợi ích khác nhau cho từng nhóm",
        "một hiện vật được diễn giải lại sau khi có tư liệu mới",
        "hai thế hệ kể khác nhau về cùng một giai đoạn",
      ],
      actions: [
        "lập bảng nguồn, tác giả, thời điểm và mục đích",
        "phân biệt dữ kiện, diễn giải và phán xét",
        "viết hai lời giải thích cạnh tranh cho cùng sự kiện",
        "đánh dấu điều chưa thể kết luận từ nguồn đang có",
      ],
      counterpoints: [
        "nguồn gần sự kiện chưa chắc hoàn toàn khách quan",
        "kết quả nhìn thấy hôm nay có thể che khuất lựa chọn khi đó",
        "lịch sử của nhóm chiếm ưu thế thường dễ được lưu giữ hơn",
        "thiếu bằng chứng không tự động chứng minh điều ngược lại",
      ],
    },
  },
  {
    keywords: ["khoa học", "science", "toán", "math", "vật lý", "sinh học"],
    profile: {
      concepts: [
        "quan sát",
        "giả thuyết",
        "biến số",
        "sai số",
        "mẫu",
        "tái lập",
        "mô hình",
        "bằng chứng",
      ],
      settings: [
        "một lớp học thử nghiệm điều kiện nảy mầm của hạt",
        "một nhóm đo chất lượng không khí tại nhiều thời điểm",
        "một câu lạc bộ so sánh hai cách ghi nhớ từ mới",
        "một đội kỹ thuật kiểm tra nguyên nhân pin thiết bị giảm nhanh",
      ],
      actions: [
        "viết giả thuyết có thể bị bác bỏ",
        "xác định biến độc lập, biến phụ thuộc và biến cần kiểm soát",
        "ước lượng nguồn sai số lớn nhất",
        "mô tả cách người khác có thể lặp lại phép thử",
      ],
      counterpoints: [
        "tương quan không tự động chứng minh quan hệ nhân quả",
        "mẫu nhỏ có thể tạo kết quả dao động mạnh",
        "một phép đo chính xác vẫn có thể đo sai khái niệm",
        "kết quả không như dự đoán vẫn có giá trị nếu quy trình rõ ràng",
      ],
    },
  },
  {
    keywords: ["sức khỏe", "health", "tâm lý", "psychology", "lifestyle", "wellness"],
    profile: {
      concepts: [
        "thói quen",
        "phục hồi",
        "môi trường",
        "động lực",
        "giới hạn cá nhân",
        "tín hiệu cơ thể",
        "hỗ trợ xã hội",
        "theo dõi tiến bộ",
      ],
      settings: [
        "một sinh viên muốn điều chỉnh giờ ngủ trước kỳ thi",
        "một nhân viên cần tạo khoảng nghỉ trong ngày làm việc",
        "một gia đình cùng xây thói quen vận động nhẹ",
        "một người thử giảm thời gian dùng điện thoại buổi tối",
      ],
      actions: [
        "chọn một thay đổi nhỏ có thể duy trì bảy ngày",
        "ghi lại tín hiệu trước và sau một thói quen",
        "thiết kế môi trường để hành động tốt trở nên dễ hơn",
        "xác định lúc cần tìm hỗ trợ chuyên môn",
      ],
      counterpoints: [
        "trải nghiệm cá nhân không thay thế tư vấn chuyên môn",
        "mục tiêu quá lớn có thể làm giảm khả năng duy trì",
        "tiến bộ hiếm khi diễn ra theo đường thẳng",
        "một lời khuyên phổ biến có thể không phù hợp bệnh nền",
      ],
    },
  },
  {
    keywords: ["ngôn ngữ", "language", "english", "tiếng anh", "giao tiếp"],
    profile: {
      concepts: [
        "ngữ cảnh",
        "từ vựng chủ động",
        "phản xạ",
        "phát âm",
        "ý định giao tiếp",
        "phản hồi",
        "lặp lại ngắt quãng",
        "tự sửa lỗi",
      ],
      settings: [
        "một sinh viên cần giới thiệu dự án trong hai phút",
        "một du khách hỏi đường trong tình huống nhiều tiếng ồn",
        "hai người luyện phản hồi khi chưa nghe rõ câu hỏi",
        "một nhóm chuẩn bị cuộc phỏng vấn bằng ngôn ngữ thứ hai",
      ],
      actions: [
        "viết năm câu có thể dùng ngay trong một bối cảnh",
        "ghi âm một phút rồi đánh dấu chỗ ngập ngừng",
        "chuyển từ mới thành câu hỏi và câu trả lời",
        "luyện ba cách diễn đạt cùng một ý",
      ],
      counterpoints: [
        "biết nghĩa chưa đồng nghĩa dùng được trong hội thoại",
        "phát âm dễ hiểu quan trọng hơn bắt chước hoàn hảo một giọng",
        "dịch từng từ có thể làm mất ý định của câu",
        "sửa mọi lỗi ngay lập tức có thể làm gián đoạn giao tiếp",
      ],
    },
  },
  {
    keywords: ["du lịch", "travel", "địa lý", "geography", "khám phá"],
    profile: {
      concepts: [
        "hành trình",
        "văn hóa địa phương",
        "ngân sách",
        "an toàn",
        "tác động môi trường",
        "nhịp trải nghiệm",
        "giao tiếp",
        "tính linh hoạt",
      ],
      settings: [
        "một nhóm bạn lập kế hoạch chuyến đi ba ngày với ngân sách giới hạn",
        "một du khách phải đổi lịch vì thời tiết",
        "một gia đình cân bằng điểm nổi tiếng và trải nghiệm địa phương",
        "một người đi một mình cần xây phương án liên lạc an toàn",
      ],
      actions: [
        "lập hành trình có khoảng đệm thay vì kín từng giờ",
        "chia ngân sách thành bắt buộc, linh hoạt và dự phòng",
        "viết danh sách câu hỏi nên hỏi người địa phương",
        "xây phương án thay thế khi điểm đến không thể tiếp cận",
      ],
      counterpoints: [
        "đi nhiều địa điểm chưa chắc tạo trải nghiệm sâu",
        "nội dung phổ biến trên mạng có thể làm quá tải cộng đồng địa phương",
        "lịch trình rẻ nhất có thể đánh đổi an toàn hoặc thời gian",
        "kế hoạch tốt vẫn cần khoảng trống để thích nghi",
      ],
    },
  },
];

function stableIndex(seed: string, length: number): number {
  const digest = createHash("sha256").update(seed).digest();
  return digest.readUInt32BE(0) % length;
}

function pick(values: string[], seed: string): string {
  return values[stableIndex(seed, values.length)];
}

function profileFor(categoryName: string): TopicProfile {
  const normalized = categoryName.toLocaleLowerCase("vi");
  return (
    PROFILES.find(({ keywords }) =>
      keywords.some((keyword) => normalized.includes(keyword)),
    )?.profile ?? DEFAULT_PROFILE
  );
}

function pageParagraphs(input: {
  metadata: DemoBookMetadata;
  profile: TopicProfile;
  chapterNumber: number;
  chapterTitle: string;
  goal: string;
  pageInChapter: number;
}): string[] {
  const { metadata, profile, chapterNumber, chapterTitle, goal, pageInChapter } =
    input;
  const seed = `${metadata.bookId}:${chapterNumber}:${pageInChapter}`;
  const concept = pick(profile.concepts, `${seed}:concept`);
  const secondConcept = pick(
    profile.concepts.filter((value) => value !== concept),
    `${seed}:second`,
  );
  const setting = pick(profile.settings, `${seed}:setting`);
  const action = pick(profile.actions, `${seed}:action`);
  const counterpoint = pick(profile.counterpoints, `${seed}:counterpoint`);
  const title = `“${metadata.title}”`;

  if (pageInChapter === 1) {
    return [
      `${DEMO_CONTENT_DISCLAIMER} Chương ${chapterNumber}, ${chapterTitle.toLocaleLowerCase(
        "vi",
      )}, dùng metadata của ${title} như một điểm khởi đầu để ${goal}.`,
      `Khái niệm dẫn đường của phần này là ${concept}. Thay vì cố ghi nhớ một định nghĩa duy nhất, người đọc hãy mô tả khái niệm bằng một ví dụ đã gặp, một trường hợp không phù hợp và một câu hỏi còn bỏ ngỏ.`,
      `Hãy tưởng tượng ${setting}. Tình huống này không thuộc tác phẩm gốc; nó được tạo riêng cho BookVerse để người đọc thử highlight, bookmark và ghi chú trong một bối cảnh đủ cụ thể.`,
      `Trước khi sang trang tiếp theo, hãy ghi một dự đoán: ${concept} sẽ thay đổi thế nào khi đặt cạnh ${secondConcept}? Dự đoán không cần đúng; mục đích là tạo mốc để so sánh sau khi hoàn thành chương.`,
    ];
  }

  if (pageInChapter === 2) {
    return [
      `Trong tình huống ${setting}, nhóm có thể bắt đầu bằng cách tách điều đã quan sát khỏi điều mới suy đoán. Việc phân biệt hai lớp này giúp cuộc thảo luận về ${concept} bớt phụ thuộc vào ấn tượng ban đầu.`,
      `Một cách phân tích là lập ba cột: dữ kiện đang có, cách giải thích có thể xảy ra và thông tin cần bổ sung. Khi ${secondConcept} xuất hiện, hãy kiểm tra xem nó là nguyên nhân, kết quả hay chỉ đồng thời xảy ra.`,
      `Điểm cần cảnh giác là ${counterpoint}. Đây không phải lý do để bác bỏ toàn bộ kết luận, mà là lời nhắc phải nói rõ điều kiện áp dụng và mức độ chắc chắn của mình.`,
      `Thao tác đọc đề xuất: chọn một câu trên trang, tạo highlight và viết ghi chú bắt đầu bằng “Tôi đồng ý khi...” hoặc “Tôi còn nghi ngờ vì...”. Cấu trúc này biến ghi chú thành lập luận có thể kiểm tra.`,
    ];
  }

  if (pageInChapter === 3) {
    return [
      `Bây giờ hãy chuyển từ phân tích sang thực hành: ${action}. Sản phẩm nhỏ này nên hoàn thành trong thời gian ngắn để người đọc nhận phản hồi sớm thay vì chỉ tích lũy thêm lý thuyết.`,
      `Khi thực hiện, hãy dùng ${concept} làm tiêu chí chính và ${secondConcept} làm tiêu chí kiểm tra chéo. Nếu hai tiêu chí dẫn tới lựa chọn khác nhau, ghi lại lý do thay vì vội ép chúng thành một đáp án.`,
      `Một kết quả hữu ích cần trả lời được ba câu hỏi: điều gì đã làm, dựa trên bằng chứng nào và giới hạn nằm ở đâu. Cách trình bày này phù hợp cả khi kết quả thành công lẫn khi thử nghiệm không như dự kiến.`,
      `Bạn có thể tìm trong nội dung sách với từ khóa “bằng chứng”, “giới hạn” hoặc tên khái niệm. Việc quay lại các trang trước giúp kiểm tra tính nhất quán của lập luận trong toàn chương.`,
    ];
  }

  return [
    `Cuối chương ${chapterNumber}, hãy quay lại dự đoán ở trang đầu. Nếu cách hiểu về ${concept} đã thay đổi, hãy viết rõ dữ kiện hoặc lập luận nào tạo ra thay đổi đó.`,
    `Bản tổng kết tốt chỉ cần bốn phần: một ý quan trọng, một ví dụ tự tạo, một giới hạn và một hành động tiếp theo. Với chương này, hành động gợi ý là ${action}.`,
    `Đừng bỏ qua phản biện rằng ${counterpoint}. Người đọc có thể giữ kết luận hiện tại, nhưng nên ghi thêm điều kiện khiến kết luận không còn đúng hoặc cần được điều chỉnh.`,
    `BookVerse lưu vị trí đọc, tiến độ và ghi chú để bạn tiếp tục ở lần sau. Phần ${chapterTitle.toLocaleLowerCase(
      "vi",
    )} kết thúc tại đây; chương kế tiếp sẽ dùng một tình huống và bộ khái niệm khác để tránh lặp lại máy móc.`,
  ];
}

/**
 * Sinh 8 chương x 4 trang theo metadata. Kết quả hoàn toàn deterministic để
 * seed có thể chạy lại mà không làm thay đổi hash tài sản đọc.
 */
export function buildDemoBookPages(
  metadata: DemoBookMetadata,
): DemoBookPage[] {
  const profile = profileFor(metadata.categoryName);
  return CHAPTERS.flatMap((chapter, chapterIndex) => {
    const chapterNumber = chapterIndex + 1;
    return Array.from({ length: 4 }, (_, pageIndex) => {
      const pageInChapter = pageIndex + 1;
      return {
        chapterNumber,
        chapterTitle: chapter.title,
        pageNumber: chapterIndex * 4 + pageInChapter,
        chunkIndex: pageIndex,
        content: pageParagraphs({
          metadata,
          profile,
          chapterNumber,
          chapterTitle: chapter.title,
          goal: chapter.goal,
          pageInChapter,
        }).join("\n\n"),
      };
    });
  });
}
