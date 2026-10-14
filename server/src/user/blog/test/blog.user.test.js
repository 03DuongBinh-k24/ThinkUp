import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { ObjectId } from 'mongodb';
import { getMongoDb, closeMongoDb } from '../../db.js';
import {
  validateEmail,
  calculateReadTime,
  generateSlug,
  formatBlogPost,
  extractTableOfContents,
  injectHeadingsWithIds,
  getBlogList,
  getBlogDetail,
  getPopularTopics,
  getMostViewedBlogPosts,
  getBlogSidebar,
  subscribeNewsletter,
  notifySubscribersNewPost,
  saveBlogPost,
  uploadBlogImage,
  createBlogRouter,
} from '../blog.user.js';

describe('Chức Năng Blog User (Kiểm thử đơn vị & tích hợp CSDL)', () => {
  let db;
  const testCategoryA = 'Lập trình Web Test';
  const testCategoryB = 'Kỹ năng mềm Test';
  const testSubEmail1 = 'tester_newsletter_1@thinkup.vn';
  const testSubEmail2 = 'tester_newsletter_2@thinkup.vn';
  const insertedBlogIds = [];

  before(async () => {
    db = await getMongoDb();

    // Dọn dẹp dữ liệu kiểm thử cũ nếu có
    await db.collection('blogs').deleteMany({ category: { $in: [testCategoryA, testCategoryB] } });
    await db.collection('newsletter_subscribers').deleteMany({ email: { $in: [testSubEmail1, testSubEmail2] } });

    // Tạo các bài viết blog mẫu cho bộ kiểm thử
    const now = new Date();
    const sampleBlogs = [
      {
        title: 'Hướng dẫn Lập Trình React Toàn Tập',
        slug: 'huong-dan-lap-trinh-react-toan-tap-test',
        description: 'Tài liệu học React từ cơ bản tới nâng cao cho người mới bắt đầu.',
        content: 'Nội dung bài viết chi tiết về React hooks, components, state management...',
        category: testCategoryA,
        category_id: generateSlug(testCategoryA),
        author: 'Nguyễn Văn Dev',
        views: 1500,
        status: 'published',
        cover_image: '/assets/blog/react-cover.jpg',
        tags: ['React', 'Frontend', 'JavaScript'],
        published_at: new Date(now.getTime() - 86400000 * 3),
        created_at: new Date(now.getTime() - 86400000 * 3),
      },
      {
        title: 'Bí quyết viết Clean Code cho JavaScript Developer',
        slug: 'bi-quyet-viet-clean-code-js-test',
        description: 'Các nguyên tắc vàng để mã nguồn của bạn luôn gọn gàng và dễ bảo trì.',
        content: 'Clean code là tiêu chuẩn không thể thiếu đối với mọi lập trình viên chuyên nghiệp...',
        category: testCategoryA,
        category_id: generateSlug(testCategoryA),
        author: 'Trần Thị Code',
        views: 3200,
        status: 'published',
        cover_image: '/assets/blog/cleancode-cover.jpg',
        tags: ['CleanCode', 'JavaScript'],
        published_at: new Date(now.getTime() - 86400000 * 2),
        created_at: new Date(now.getTime() - 86400000 * 2),
      },
      {
        title: 'Kỹ năng giao tiếp và làm việc nhóm trong dự án Agile',
        slug: 'ky-nang-giao-tiep-va-lam-viec-nhom-agile-test',
        description: 'Phương pháp nâng cao sự thấu hiểu và phối hợp hiệu quả trong team tech.',
        content: 'Giao tiếp là chìa khóa then chốt quyết định sự thành bại của một dự án công nghệ...',
        category: testCategoryB,
        category_id: generateSlug(testCategoryB),
        author: 'Lê Quản Trị',
        views: 850,
        status: 'published',
        cover_image: '/assets/blog/softskills-cover.jpg',
        tags: ['Agile', 'SoftSkills'],
        published_at: new Date(now.getTime() - 86400000 * 1),
        created_at: new Date(now.getTime() - 86400000 * 1),
      },
    ];

    const insertResult = await db.collection('blogs').insertMany(sampleBlogs);
    Object.values(insertResult.insertedIds).forEach(id => insertedBlogIds.push(id));
  });

  after(async () => {
    // Dọn dẹp toàn bộ dữ liệu kiểm thử
    if (db) {
      if (insertedBlogIds.length > 0) {
        await db.collection('blogs').deleteMany({ _id: { $in: insertedBlogIds } });
      }
      await db.collection('blogs').deleteMany({ category: { $in: [testCategoryA, testCategoryB] } });
      await db.collection('newsletter_subscribers').deleteMany({ email: { $in: [testSubEmail1, testSubEmail2] } });
    }
    await closeMongoDb();
  });

  describe('1. Kiểm thử các hàm tiện ích (Helpers & Utilities)', () => {
    it('TC-UTIL-01: validateEmail kiểm tra đúng định dạng email', () => {
      assert.strictEqual(validateEmail('test@thinkup.vn').valid, true);
      assert.strictEqual(validateEmail('invalid-email').valid, false);
      assert.strictEqual(validateEmail('test with space@thinkup.vn').valid, false);
      assert.strictEqual(validateEmail('').valid, false);
      assert.strictEqual(validateEmail(null).valid, false);
    });

    it('TC-UTIL-02: generateSlug chuyển đổi tiếng Việt có dấu thành slug không dấu chuẩn', () => {
      const slug = generateSlug('Lập trình Fullstack Web 2026 với Node.js & React!');
      assert.strictEqual(slug, 'lap-trinh-fullstack-web-2026-voi-nodejs-react');
    });

    it('TC-UTIL-03: calculateReadTime tính đúng thời gian đọc theo số lượng từ', () => {
      const shortText = 'Một đoạn văn ngắn khoảng mười từ.';
      assert.strictEqual(calculateReadTime(shortText), '1 phút');

      const longText = Array(450).fill('từ').join(' ');
      assert.strictEqual(calculateReadTime(longText), '3 phút');
    });

    it('TC-UTIL-04: formatBlogPost chuẩn hóa đầy đủ các trường hiển thị của bài blog', () => {
      const mockDoc = {
        _id: new ObjectId(),
        title: 'Bài Viết Mẫu',
        description: 'Mô tả ngắn',
        category: 'Công nghệ',
        author: 'Admin',
        published_at: new Date('2026-05-15T10:00:00Z'),
        views: 120,
        content: 'Nội dung bài viết mẫu',
      };
      const formatted = formatBlogPost(mockDoc);
      assert.ok(formatted.id);
      assert.strictEqual(formatted.title, 'Bài Viết Mẫu');
      assert.strictEqual(formatted.description, 'Mô tả ngắn');
      assert.strictEqual(formatted.category, 'Công nghệ');
      assert.strictEqual(formatted.author, 'Admin');
      assert.strictEqual(formatted.date, '2026-05-15');
      assert.ok(formatted.readTime);
      assert.ok(formatted.coverImage);
      assert.strictEqual(formatted.views, 120);
      assert.ok(Array.isArray(formatted.tableOfContents));
    });

    it('TC-UTIL-05: extractTableOfContents chỉ sinh neo cho heading người dùng có chủ động tạo id, không tự sinh neo', () => {
      const htmlContent = `
        <h2>1. Giới thiệu tổng quan không có neo</h2>
        <p>Nội dung giới thiệu...</p>
        <h3 id="cai-dat-moi-truong">1.1 Cài đặt môi trường có neo người dùng tạo</h3>
        <p>Chi tiết cài đặt...</p>
        <h2>2. Cấu trúc dự án không có neo</h2>
      `;
      // Chỉ lấy đúng heading có id neo người dùng chủ động tạo
      const toc = extractTableOfContents(htmlContent);
      assert.strictEqual(toc.length, 1, 'Chỉ duy nhất 1 heading có id neo được đưa vào mục lục');
      assert.strictEqual(toc[0].id, 'cai-dat-moi-truong');
      assert.strictEqual(toc[0].level, 3);

      // Nếu người dùng KHÔNG tạo neo nào trong bài viết -> Mục lục rỗng []
      const emptyToc = extractTableOfContents('<h2>Tiêu đề bình thường</h2><p>Đoạn văn</p>');
      assert.strictEqual(emptyToc.length, 0, 'Tuyệt đối không tự ý sinh neo khi người dùng không tạo');
    });

    it('TC-UTIL-06: injectHeadingsWithIds luôn bảo toàn 100% nội dung gốc của người dùng', () => {
      const rawHtml = '<h2>Tiêu đề không có id</h2><p>Đoạn văn có <strong>in đậm</strong></p>';
      const output = injectHeadingsWithIds(rawHtml);
      assert.strictEqual(output, rawHtml, 'Không được tự ý tiêm bất kỳ id nào vào nội dung của người dùng');
    });

    it('TC-UTIL-07: uploadBlogImage xử lý và trả về đường dẫn ảnh hợp lệ cho thanh công cụ', async () => {
      const res = await uploadBlogImage({ url: 'https://example.com/banner.jpg' });
      assert.strictEqual(res.url, 'https://example.com/banner.jpg');
      assert.ok(res.message);
    });
  });

  describe('2. Hàm truy xuất danh sách bài blog (getBlogList)', () => {
    it('TC-LIST-01: Xuất đầy đủ các trường yêu cầu: chủ đề, tên bài blog, mô tả ngắn, tác giả, ngày đăng, thời gian đọc, hình ảnh bìa', async () => {
      const result = await getBlogList({ category: testCategoryA, limit: 2 }, { db });

      assert.ok(result);
      assert.ok(Array.isArray(result.posts));
      assert.strictEqual(result.posts.length, 2);

      const post = result.posts[0];
      // Kiểm tra đầy đủ từng trường theo yêu cầu của đề bài:
      assert.ok(post.category, 'Phải có trường chủ đề bài blog (category)');
      assert.ok(post.title, 'Phải có trường tên bài blog (title)');
      assert.ok(post.description, 'Phải có trường mô tả ngắn (description)');
      assert.ok(post.author, 'Phải có trường tác giả (author)');
      assert.ok(post.date, 'Phải có trường ngày đăng bài (date)');
      assert.ok(post.readTime, 'Phải có trường thời gian đọc (readTime)');
      assert.ok(post.coverImage, 'Phải có trường hình ảnh bìa (coverImage)');
      assert.strictEqual(typeof post.views, 'number', 'Phải có trường lượt xem dạng số');
    });

    it('TC-LIST-02: Lọc danh sách bài viết theo chủ đề (category)', async () => {
      const result = await getBlogList({ category: testCategoryB }, { db });
      assert.strictEqual(result.posts.length, 1);
      assert.strictEqual(result.posts[0].category, testCategoryB);
      assert.strictEqual(result.posts[0].title, 'Kỹ năng giao tiếp và làm việc nhóm trong dự án Agile');
    });

    it('TC-LIST-03: Tìm kiếm bài viết theo từ khóa (search)', async () => {
      const result = await getBlogList({ search: 'Clean Code', category: testCategoryA }, { db });
      assert.strictEqual(result.posts.length, 1);
      assert.ok(result.posts[0].title.includes('Clean Code'));
    });

    it('TC-LIST-04: Phân trang danh sách bài viết đúng chỉ số page, limit và hasMore', async () => {
      const resultPage1 = await getBlogList({ category: testCategoryA, page: 1, limit: 1 }, { db });
      assert.strictEqual(resultPage1.posts.length, 1);
      assert.strictEqual(resultPage1.page, 1);
      assert.strictEqual(resultPage1.hasMore, true);
    });
  });

  describe('3. Hàm xuất số lượng về những chủ đề phổ biến (getPopularTopics)', () => {
    it('TC-TOPIC-01: Thống kê số lượng bài viết của từng chủ đề và sắp xếp theo độ phổ biến giảm dần', async () => {
      const topics = await getPopularTopics({ db });

      assert.ok(Array.isArray(topics));
      assert.ok(topics.length >= 2);

      const topicA = topics.find(t => t.label === testCategoryA);
      const topicB = topics.find(t => t.label === testCategoryB);

      assert.ok(topicA, `Chủ đề ${testCategoryA} phải tồn tại`);
      assert.strictEqual(topicA.count, 2, 'Chủ đề A có 2 bài viết mẫu đã tạo');

      assert.ok(topicB, `Chủ đề ${testCategoryB} phải tồn tại`);
      assert.strictEqual(topicB.count, 1, 'Chủ đề B có 1 bài viết mẫu đã tạo');

      // Xác nhận chủ đề có nhiều bài hơn (count = 2) đứng trước chủ đề có ít bài hơn (count = 1)
      const indexA = topics.findIndex(t => t.label === testCategoryA);
      const indexB = topics.findIndex(t => t.label === testCategoryB);
      assert.ok(indexA < indexB, 'Chủ đề có nhiều bài hơn phải được sắp xếp trước');
    });
  });

  describe('4. Hàm xuất những bài viết được xem nhiều (getMostViewedBlogPosts)', () => {
    it('TC-VIEW-01: Xuất tên bài blog (title) và lượt xem (views) của các bài viết được xem nhiều nhất', async () => {
      const mostViewed = await getMostViewedBlogPosts({ db, limit: 5 });

      assert.ok(Array.isArray(mostViewed));
      assert.ok(mostViewed.length >= 2);

      // Bài viết đầu tiên phải có lượt xem cao nhất trong danh mục test (3200 views)
      const cleanCodePost = mostViewed.find(p => p.title.includes('Clean Code'));
      assert.ok(cleanCodePost, 'Phải có bài Clean Code trong danh sách xem nhiều');
      assert.strictEqual(cleanCodePost.views, 3200, 'Lượt xem của bài Clean Code phải bằng 3200');
      assert.ok(cleanCodePost.title, 'Phải xuất tên bài blog');

      // Kiểm tra tính giảm dần của lượt xem
      for (let i = 0; i < mostViewed.length - 1; i++) {
        assert.ok(mostViewed[i].views >= mostViewed[i + 1].views, 'Danh sách phải sắp xếp giảm dần theo lượt xem');
      }
    });

    it('TC-VIEW-02: getBlogSidebar gộp cả chủ đề phổ biến và bài viết xem nhiều cho FE', async () => {
      const sidebar = await getBlogSidebar({ db });
      assert.ok(sidebar.popularTopics);
      assert.ok(sidebar.mostViewedArticles);
      assert.ok(Array.isArray(sidebar.popularTopics));
      assert.ok(Array.isArray(sidebar.mostViewedArticles));
    });
  });

  describe('5. Hàm truy xuất chi tiết một bài blog (getBlogDetail)', () => {
    it('TC-DETAIL-01: Lấy chi tiết bài viết theo ID, tự động tăng lượt xem và trả về bài trước, bài sau, bài liên quan', async () => {
      const targetId = insertedBlogIds[0].toString();
      const initialDetail = await getBlogDetail(targetId, { db, incrementView: false });
      const initialViews = initialDetail.post.views;

      // Gọi lấy chi tiết với incrementView: true (mặc định)
      const detail = await getBlogDetail(targetId, { db });
      assert.strictEqual(detail.post.views, initialViews + 1, 'Lượt xem phải được tăng thêm 1');
      assert.ok(detail.post.title);
      assert.ok(detail.post.description);
      assert.ok(detail.post.category);
      assert.ok(detail.post.author);
      assert.ok(detail.post.date);
      assert.ok(detail.post.readTime);
      assert.ok(detail.post.content);
      assert.ok('authorAvatar' in detail.post, 'Phải có trường authorAvatar');
      assert.ok(Array.isArray(detail.post.tableOfContents), 'Phải có mảng mục lục tableOfContents');
      assert.ok(Array.isArray(detail.relatedPosts));
    });

    it('TC-DETAIL-02: Báo lỗi 404 BLOG_NOT_FOUND khi mã bài viết không tồn tại', async () => {
      const nonExistentId = new ObjectId().toString();
      await assert.rejects(
        async () => {
          await getBlogDetail(nonExistentId, { db });
        },
        err => err.status === 404 && err.code === 'BLOG_NOT_FOUND'
      );
    });
  });

  describe('6. Hàm đăng ký nhận bản tin (subscribeNewsletter)', () => {
    it('TC-SUB-01: Đăng ký email mới hợp lệ thành công và lưu vào CSDL', async () => {
      const result = await subscribeNewsletter({ email: testSubEmail1 }, { db });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.alreadySubscribed, false);
      assert.ok(result.message);

      // Xác nhận trong CSDL thật
      const subscriber = await db.collection('newsletter_subscribers').findOne({ email: testSubEmail1 });
      assert.ok(subscriber);
      assert.strictEqual(subscriber.status, 'active');
    });

    it('TC-SUB-02: Thông báo người dùng khi email đã được đăng ký trước đó', async () => {
      const result = await subscribeNewsletter({ email: testSubEmail1 }, { db });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.alreadySubscribed, true);
      assert.ok(result.message.includes('trước đó'));
    });

    it('TC-SUB-03: Báo lỗi 400 INVALID_EMAIL khi email không đúng định dạng', async () => {
      await assert.rejects(
        async () => {
          await subscribeNewsletter({ email: 'email_sai_dinh_dang' }, { db });
        },
        err => err.status === 400 && err.code === 'INVALID_EMAIL'
      );
    });
  });

  describe('7. Hàm thông báo bài đăng mới về Gmail người dùng (notifySubscribersNewPost)', () => {
    it('TC-NOTIFY-01: Gửi thông báo đến danh sách người dùng đăng ký nhận bản tin khi có bài mới', async () => {
      // Đăng ký thêm email thứ 2
      await subscribeNewsletter({ email: testSubEmail2 }, { db });

      const newPostInfo = {
        title: 'Khóa học TypeScript Nâng Cao Đã Chính Thức Ra Mắt',
        description: 'Nắm vững Generic, Decorators, Type Manipulation trong TypeScript 2026.',
        category: 'Công nghệ',
        readTime: '6 phút',
        slug: 'khoa-hoc-typescript-nang-cao-test',
      };

      const notifyResult = await notifySubscribersNewPost(newPostInfo, { db });

      assert.ok(notifyResult.totalSubscribers >= 2, 'Phải có ít nhất 2 người đăng ký đã tạo');
      assert.strictEqual(typeof notifyResult.notified, 'number');
      assert.strictEqual(typeof notifyResult.failed, 'number');
    });

    it('TC-NOTIFY-02: Báo lỗi khi dữ liệu bài viết không hợp lệ', async () => {
      await assert.rejects(
        async () => {
          await notifySubscribersNewPost(null, { db });
        },
        err => err.status === 400 && err.code === 'INVALID_BLOG_DATA'
      );
    });
  });

  describe('8. Hàm tạo bài viết blog và router Express sẵn sàng nối API', () => {
    it('TC-CREATE-01: Tạo bài viết mới tự động sinh slug và tính toán thời gian đọc', async () => {
      const created = await saveBlogPost(
        {
          title: 'Bài Viết Kiểm Thử Mới Tạo Tự Động',
          content: 'Nội dung bài viết dùng để kiểm thử việc tính toán thời gian đọc và sinh slug tự động.',
          category: testCategoryA,
          author: 'Tester ThinkUp',
        },
        { db, notify: false }
      );

      assert.ok(created.id);
      assert.ok(created.slug.includes('bai-viet-kiem-thu-moi-tao'));
      insertedBlogIds.push(new ObjectId(created.id));
    });

    it('TC-ROUTER-01: Khởi tạo router Express độc lập sẵn sàng gắn vào app.use("/api/blog")', () => {
      const router = createBlogRouter(express);
      assert.ok(router);
      assert.strictEqual(typeof router, 'function');
    });
  });
});
